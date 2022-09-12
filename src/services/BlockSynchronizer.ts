import { Logger } from 'winston';
import { inject, injectable } from 'inversify';
import newrelic from 'newrelic';
import { ChainContract } from '../contracts/ChainContract';
import Block, { IBlock } from '../models/Block';
import Leaf from '../models/Leaf';
import LeavesSynchronizer from '../services/LeavesSynchronizer';
import { BlockStatus } from '../types/blocks';
import { ChainInstanceResolver } from './ChainInstanceResolver';
import { ChainStatus } from '../types/ChainStatus';
import RevertedBlockResolver from './RevertedBlockResolver';
import Settings from '../types/Settings';
import { BlockchainRepository } from '../repositories/BlockchainRepository';
import { ChainContractRepository } from '../repositories/ChainContractRepository';
import { ChainsIds } from '../types/ChainsIds';
import LatestIdsProvider from './LatestIdsProvider';
import BlockChainData from '../models/BlockChainData';
import { ChainStatusExtended, SETTLED_FULFILLED } from '../types/custom';

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

  async apply(): Promise<void> {
    const chainsChecksDataSettled = await Promise.allSettled(
      Object.values(ChainsIds)
        .filter((chainId) => chainId != ChainsIds.SOLANA)
        .map((chainId) => this.checkForRevertedBlocks(chainId))
    );

    const chainsChecksData = chainsChecksDataSettled
      .map((data) => (data.status == SETTLED_FULFILLED ? data.value : undefined))
      .filter((data) => !!data);

    if (chainsChecksData.filter((data) => data.reverted).length > 0) {
      return;
    }

    // we search for masterchain, because we need active list of validators
    const masterChainStatus = chainsChecksData.filter(
      (data) => data.chainId === this.settings.blockchain.homeChain.chainId
    )[0].status;

    // masterchain doesn't have to have latest data, so we simply search for highest value
    masterChainStatus.nextBlockId = chainsChecksData.reduce((acc, data) => Math.max(acc, data.status.nextBlockId), 0);

    this.logger.info('Synchronizing blocks');

    const mongoBlocks = await this.getMongoBlocksToSynchronize();

    if (!mongoBlocks.length) {
      return;
    }

    this.logger.debug(`Got ${mongoBlocks.length} mongoBlocks to synchronize`);

    const [leavesSynchronizers, blockIds] = await this.processBlocks(masterChainStatus, mongoBlocks);

    if (blockIds.length > 0) {
      this.logger.info(`Synchronized leaves for blocks: ${blockIds.join(',')}`);
      const updated = await this.updateSynchronizedBlocks(await Promise.all(leavesSynchronizers), blockIds);
      const success = updated.updatedFinalizedBlocks;
      const failed = updated.updatedFailedBlocks;
      this.logger.info(`Finalized successfully/failed: ${success}/${failed}. Total: ${success + failed}`);
    }
  }

  async checkForRevertedBlocks(chainId: ChainsIds): Promise<ChainStatusExtended> {
    this.logger.info(`DEBUG: checkForRevertedBlocks: ${chainId}`);

    const chain = <ChainContract>this.chainContractRepository.get(chainId);

    const [chainStatus, [lastSavedBlockId]] = await Promise.all([
      chain.resolveStatus<ChainStatus>(),
      this.latestIdsProvider.getLastSavedBlockIdAndStartAnchor(chainId),
    ]);

    const reverted = await this.revertedBlockResolver.apply(lastSavedBlockId, chainStatus.nextBlockId, chainId);

    return {
      reverted: reverted > 0,
      status: chainStatus,
      chainId,
    };
  }

  private getMongoBlocksToSynchronize = async (): Promise<IBlock[]> => {
    const blocksInProgress = await Block.find({
      status: { $nin: [BlockStatus.Finalized, BlockStatus.Failed] },
    })
      .sort({ blockId: -1 })
      .limit(this.settings.app.blockSyncBatchSize)
      .exec();

    const confirmations = Object.values(this.settings.blockchain.multiChains).reduce(
      (acc, s) => Math.max(acc, s.confirmations),
      0
    );

    const blocksToConfirm = await Block.find({
      status: { $in: [BlockStatus.Finalized, BlockStatus.Failed] },
    })
      .sort({ blockId: -1 })
      .limit(confirmations)
      .exec();

    return blocksInProgress.concat(blocksToConfirm);
  };

  private updateSynchronizedBlocks = async (
    leavesSynchronizers: (boolean | null)[],
    blockIds: number[]
  ): Promise<{ updatedFinalizedBlocks: number; updatedFailedBlocks: number }> => {
    const data = leavesSynchronizers.map((success: boolean | null, i: number) => {
      if (success == null) {
        return { status: undefined, blockId: 0 };
      }

      return {
        status: success ? BlockStatus.Finalized : BlockStatus.Failed,
        blockId: blockIds[i],
      };
    });

    const finalized = data.filter((d) => d.status == BlockStatus.Finalized).map((d) => d.blockId);
    const failed = data.filter((d) => d.status == BlockStatus.Failed).map((d) => d.blockId);

    this.logger.info(
      `[updateSynchronizedBlocks] ${finalized.length}/${failed.length} of ${leavesSynchronizers.length}`
    );

    if (failed.length > 0) {
      this.noticeError(`[updateSynchronizedBlocks] Blocks: ${failed.join(',')}: failed`);
    }

    const [updatedFinalizedBlocks, updatedFailedBlocks] = await Promise.all([
      finalized.length == 0
        ? undefined
        : Block.updateMany(
            { blockId: { $in: finalized } },
            { status: BlockStatus.Finalized },
            { new: false, upsert: true }
          ),
      failed.length == 0
        ? undefined
        : Block.updateMany({ blockId: { $in: failed } }, { status: BlockStatus.Failed }, { new: false, upsert: true }),
      finalized.length == 0
        ? undefined
        : BlockChainData.updateMany(
            { blockId: { $in: finalized } },
            { status: BlockStatus.Finalized },
            { new: false, upsert: true }
          ),
      failed.length == 0
        ? undefined
        : BlockChainData.updateMany(
            { blockId: { $in: failed } },
            { status: BlockStatus.Failed },
            { new: false, upsert: true }
          ),
    ]);

    return {
      updatedFinalizedBlocks: updatedFinalizedBlocks ? updatedFinalizedBlocks.nModified : 0,
      updatedFailedBlocks: updatedFailedBlocks ? updatedFailedBlocks.nModified : 0,
    };
  };

  private verifyProcessedBlock = async (mongoBlock: IBlock): Promise<boolean> => {
    // TODO do we need to handle solana??
    const [blockChainData] = await BlockChainData.find({
      blockId: mongoBlock.blockId,
      chainId: { $ne: ChainsIds.SOLANA },
    }).limit(1);

    if (!blockChainData) {
      throw new Error(`Block ${mongoBlock.blockId} saved without BlockChainData`);
    }

    const chainContract = this.chainContractRepository.get(blockChainData.chainId);
    const onChainBlocksData = await chainContract.resolveBlockData(blockChainData.chainAddress, mongoBlock.blockId);

    if (!this.equalRoots(mongoBlock.root, onChainBlocksData.root)) {
      this.logger.warn(
        `Invalid ROOT for blockId ${mongoBlock.blockId}. Expected ${onChainBlocksData.root} but have ${mongoBlock.root}. Reverting.`
      );

      await BlockSynchronizer.revertBlocks(mongoBlock.blockId);
      // blocksWereReverted;
      return true;
    }

    return false;
  };

  private equalRoots = (a: string, b: string): boolean => {
    // backwards compatible check for squashed root
    return a == b || a.slice(0, 58) == b.slice(0, 58);
  };

  private processBlocks = async (
    chainStatus: ChainStatus,
    mongoBlocks: IBlock[]
  ): Promise<[leavesSynchronizersStatus: Promise<boolean | null>[], synchronizedIds: number[]]> => {
    const leavesSynchronizers: Promise<boolean | null>[] = [];
    const blockIds: number[] = [];
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
            blockIds.push(mongoBlock.blockId);
            leavesSynchronizers.push(this.leavesSynchronizer.apply(chainStatus, mongoBlock._id));
            return;

          case BlockStatus.Finalized:
          case BlockStatus.Failed:
            blocksWereReverted = await this.verifyProcessedBlock(mongoBlock);
            return;

          default:
            this.noticeError(`Block ${mongoBlock._id} with odd status: ${mongoBlock.status}`);
            return;
        }
      })
    );

    return [leavesSynchronizers, blockIds];
  };

  private static revertBlocks = async (
    blockId: number
  ): Promise<({ ok?: number; n?: number } & { deletedCount?: number })[]> => {
    const condition = { blockId: { $gte: blockId } };
    // we can't have different roots for same blockId, so if we detect invalid root, we're reverting all blockchains
    // blocks will be re-fetched.
    return Promise.all([Block.deleteMany(condition), Leaf.deleteMany(condition), BlockChainData.deleteMany(condition)]);
  };

  private noticeError = (err: string): void => {
    newrelic.noticeError(Error(err));
    this.logger.error(err);
  };
}

export default BlockSynchronizer;
