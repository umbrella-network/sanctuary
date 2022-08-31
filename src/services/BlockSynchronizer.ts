import { Logger } from 'winston';
import { inject, injectable, postConstruct } from 'inversify';
import newrelic from 'newrelic';
import { ChainContract } from '../contracts/ChainContract';
import Block, { IBlock } from '../models/Block';
import Leaf from '../models/Leaf';
import LeavesSynchronizer from '../services/LeavesSynchronizer';
import ChainInstance from '../models/ChainInstance';
import { BlockStatus } from '../types/blocks';
import { ChainInstanceResolver } from './ChainInstanceResolver';
import { ChainStatus } from '../types/ChainStatus';
import RevertedBlockResolver from './RevertedBlockResolver';
import Settings from '../types/Settings';
import { BlockchainRepository } from '../repositories/BlockchainRepository';
import { ChainContractRepository } from '../repositories/ChainContractRepository';
import { Blockchain } from '../lib/Blockchain';
import { ChainsIds } from '../types/ChainsIds';
import LatestIdsProvider from "./LatestIdsProvider";

@injectable()
class BlockSynchronizer {
  @inject('Logger') private logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(ChainInstanceResolver) private chainInstanceResolver!: ChainInstanceResolver;
  @inject(LeavesSynchronizer) private leavesSynchronizer!: LeavesSynchronizer;
  @inject(RevertedBlockResolver) revertedBlockResolver!: RevertedBlockResolver;
  @inject(BlockchainRepository) private blockchainRepository!: BlockchainRepository;
  @inject(ChainContractRepository) chainContractRepository: ChainContractRepository;
  @inject(LatestIdsProvider) latestIdsProvider: LatestIdsProvider;

  private chainId!: string;
  private blockchain!: Blockchain;
  private chainContract!: ChainContract;

  setup(chainId: ChainsIds): void {
    if (this.chainId) {
      return;
    }

    this.chainId = chainId;
    this.blockchain = this.blockchainRepository.get(chainId);

    if (!this.blockchain.getContractRegistryAddress()) {
      // scheduler catch
      return;
    }

    this.chainContract = <ChainContract>this.chainContractRepository.get(chainId);
    this.chainInstanceResolver.setup(chainId);
  }

  async apply(chainId: ChainsIds): Promise<void> {
    this.setup(chainId);

    const [chainStatus, [lastSavedBlockId], highestBlockId] = await Promise.all([
      this.chainContract.resolveStatus<ChainStatus>(),
      this.latestIdsProvider.getLastSavedBlockIdAndStartAnchor(chainId),
      this.latestIdsProvider.getLatestBlockId(),
    ]);

    if ((await this.revertedBlockResolver.apply(lastSavedBlockId, chainStatus.nextBlockId, chainId)) > 0) {
      return;
    }

    this.logger.info(`[${chainId}] Synchronizing blocks at blockId ${highestBlockId}`);

    const mongoBlocks = await this.getMongoBlocksToSynchronize();

    if (!mongoBlocks.length) {
      return;
    }

    this.logger.debug(`got ${mongoBlocks.length} mongoBlocks to synchronize`);

    if (!(await this.verifyBlocks(mongoBlocks))) {
      return;
    }

    const [leavesSynchronizers, blockIds] = await this.processBlocks(chainStatus, mongoBlocks);

    if (blockIds.length > 0) {
      this.logger.info(`Synchronized leaves for blocks: ${blockIds.join(',')}`);
      const updated = await this.updateSynchronizedBlocks(await Promise.all(leavesSynchronizers), blockIds);
      const success = updated.filter((b) => b.status == BlockStatus.Finalized).length;
      const failed = updated.filter((b) => b.status == BlockStatus.Failed).length;
      this.logger.info(`Finalized successfully/failed: ${success}/${failed}. Total blocks updated: ${updated.length}`);
    }
  }

  private getMongoBlocksToSynchronize = async (): Promise<IBlock[]> => {
    const blocksInProgress = await Block.find({
      status: { $nin: [BlockStatus.Finalized, BlockStatus.Failed] },
    })
      .sort({ blockId: -1 })
      .limit(this.settings.app.blockSyncBatchSize)
      .exec();

    const blocksToConfirm = await Block.find({
      status: { $in: [BlockStatus.Finalized, BlockStatus.Failed] },
    })
      .sort({ blockId: -1 })
      .limit(this.blockchain.settings.confirmations)
      .exec();

    return blocksInProgress.concat(blocksToConfirm);
  };

  private updateSynchronizedBlocks = async (
    leavesSynchronizers: (boolean | null)[],
    blockIds: string[]
  ): Promise<IBlock[]> => {
    const filtered = leavesSynchronizers.filter((success: boolean) => success !== null);
    this.logger.info(`[updateSynchronizedBlocks] Updating ${filtered.length}/${leavesSynchronizers.length}`);

    return Promise.all(
      filtered.map((success: boolean, i: number) => {
        const status = success ? BlockStatus.Finalized : BlockStatus.Failed;

        if (!success) {
          this.noticeError(`[updateSynchronizedBlocks] Block ${blockIds[i]}: ${status}`);
        }

        return Block.findOneAndUpdate(
          { _id: blockIds[i] },
          {
            status: status,
          },
          {
            new: false,
            upsert: true,
          }
        );
      })
    );
  };

  private verifyBlocks = async (mongoBlocks: IBlock[]): Promise<boolean> => {
    let verified = true;

    await Promise.all(
      mongoBlocks.map((mongoBlock: IBlock) => {
        switch (mongoBlock.status) {
          case BlockStatus.Finalized:
          case BlockStatus.Failed:
            if (!BlockSynchronizer.brokenBlock(mongoBlock)) {
              return;
            }

            this.noticeError(`Invalid Block found: ${JSON.stringify(mongoBlock)}. Removing.`);
            verified = false;
            return Block.deleteOne({ _id: mongoBlock._id });
        }
      })
    );

    return verified;
  };

  private processBlocks = async (
    chainStatus: ChainStatus,
    mongoBlocks: IBlock[]
  ): Promise<[leavesSynchronizersStatus: Promise<boolean | null>[], synchronizedIds: string[]]> => {
    const leavesSynchronizers: Promise<boolean | null>[] = [];
    const blockIds: string[] = [];
    let blocksWereReverted = false;

    await Promise.all(
      <Promise<never>[]>mongoBlocks.map(async (mongoBlock: IBlock) => {
        if (blocksWereReverted) {
          return;
        }

        this.logger.debug(
          `Processing block ${mongoBlock._id} with dataTimestamp: ${mongoBlock.dataTimestamp} and status: ${mongoBlock.status}`
        );

        switch (mongoBlock.status) {
          case BlockStatus.Completed:
            this.logger.info(`Start synchronizing leaves for completed block: ${mongoBlock.blockId}`);
            blockIds.push(mongoBlock._id);
            leavesSynchronizers.push(this.leavesSynchronizer.apply(chainStatus, mongoBlock._id));
            return;

          case BlockStatus.Finalized:
          case BlockStatus.Failed:
            // eslint-disable-next-line no-case-declarations
            const onChainBlocksData = await this.chainContract.resolveBlockData(
              mongoBlock.chainAddress,
              mongoBlock.blockId
            );

            if (mongoBlock.root != onChainBlocksData.root) {
              this.logger.warn(
                `Invalid ROOT for blockId ${mongoBlock.blockId}. Expected ${onChainBlocksData.root} but have ${mongoBlock.root}. Reverting.`
              );

              blocksWereReverted = true;
              return BlockSynchronizer.revertBlocks(mongoBlock.blockId);
            }

            return;

          default:
            this.noticeError(`Block ${mongoBlock._id} with odd status: ${mongoBlock.status}`);
            return;
        }
      })
    );

    return [leavesSynchronizers, blockIds];
  };

  private static brokenBlock = (block: IBlock): boolean => {
    return block.blockId === undefined || block.chainAddress === undefined;
  };

  private static revertBlocks = async (
    blockId: number
  ): Promise<({ ok?: number; n?: number } & { deletedCount?: number })[]> => {
    const condition = { blockId: { $gte: blockId } };
    // TODO for Dariusz - update this on adjusting resolver task
    // only for chainId, and same rule as in other place, if there will be no BlockChainData after deletion for condition, then we should remove Block as well.
    return Promise.all([Block.deleteMany(condition), Leaf.deleteMany(condition)]);
  };

  private noticeError = (err: string): void => {
    newrelic.noticeError(Error(err));
    this.logger.error(err);
  };
}

export default BlockSynchronizer;
