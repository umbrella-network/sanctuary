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

@injectable()
class BlockSynchronizer {
  @inject('Logger') private logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(ChainInstanceResolver) private chainInstanceResolver!: ChainInstanceResolver;
  @inject(LeavesSynchronizer) private leavesSynchronizer!: LeavesSynchronizer;
  @inject(RevertedBlockResolver) revertedBlockResolver!: RevertedBlockResolver;
  @inject(BlockchainRepository) private blockchainRepository!: BlockchainRepository;
  @inject(ChainContractRepository) chainContractRepository: ChainContractRepository;

  private chainId!: string;
  private blockchain!: Blockchain;
  private chainContract!: ChainContract;

  @postConstruct()
  setup(): void {
    if (this.chainId) {
      return;
    }

    this.chainId = this.settings.blockchain.homeChain.chainId;
    this.blockchain = this.blockchainRepository.get(this.chainId);

    if (!this.blockchain.getContractRegistryAddress()) {
      // scheduler catch
      return;
    }

    this.chainContract = <ChainContract>this.chainContractRepository.get(this.chainId);
    this.chainInstanceResolver.setup(this.chainId);
  }

  async apply(): Promise<void> {
    const [chainStatus, [lastSavedBlockId]] = await Promise.all([
      this.chainContract.resolveStatus<ChainStatus>(),
      this.getLastSavedBlockIdAndStartAnchor(),
    ]);

    if ((await this.revertedBlockResolver.apply(lastSavedBlockId, chainStatus.nextBlockId)) > 0) {
      return;
    }

    this.logger.info(`Synchronizing blocks at blockId ${chainStatus.nextBlockId}`);

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
      this.logger.info(`Finalized successfully: ${updated.filter((b) => b.status == BlockStatus.Finalized).length}`);
    }
  }

  getLastSavedBlockIdAndStartAnchor = async (): Promise<[number, number]> => {
    const lastSavedBlock = await Block.find({}).sort({ blockId: -1 }).limit(1).exec();
    return lastSavedBlock[0]
      ? [lastSavedBlock[0].blockId, lastSavedBlock[0].anchor + 1]
      : [0, await this.getLowestChainAnchor()];
  };

  private getLowestChainAnchor = async (): Promise<number> => {
    const oldestChain = await ChainInstance.find({ chainId: this.chainId }).limit(1).sort({ blockId: 1 }).exec();
    return oldestChain[0].anchor;
  };

  private getMongoBlocksToSynchronize = async (): Promise<IBlock[]> => {
    const blocksInProgress = await Block.find({
      status: { $nin: [BlockStatus.Finalized, BlockStatus.Failed] },
    })
      .sort({ blockId: 1 }) // must be from latest/asc!
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
    return Promise.all([Block.deleteMany(condition), Leaf.deleteMany(condition)]);
  };

  private noticeError = (err: string): void => {
    newrelic.noticeError(Error(err));
    this.logger.error(err);
  };
}

export default BlockSynchronizer;
