import { Logger } from 'winston';
import { inject, injectable } from 'inversify';
import ChainContract from '../contracts/ChainContract';
import Block, { IBlock } from '../models/Block';
import Leaf from '../models/Leaf';
import LeavesSynchronizer from '../services/LeavesSynchronizer';
import ChainInstance from '../models/ChainInstance';
import { BigNumber } from 'ethers';
import { BlockStatus } from '../types/blocks';
import { ChainInstanceResolver } from './ChainInstanceResolver';
import { ChainStatus } from '../types/ChainStatus';
import RevertedBlockResolver from './RevertedBlockResolver';
import Settings from '../types/Settings';
import Blockchain from '../lib/Blockchain';

@injectable()
class BlockSynchronizer {
  @inject('Logger') private logger!: Logger;
  @inject(Blockchain) private blockchain!: Blockchain;
  @inject('Settings') settings!: Settings;
  @inject(ChainContract) private chainContract!: ChainContract;
  @inject(ChainInstanceResolver) private chainInstanceResolver!: ChainInstanceResolver;
  @inject(LeavesSynchronizer) private leavesSynchronizer!: LeavesSynchronizer;
  @inject(RevertedBlockResolver) reveredBlockResolver!: RevertedBlockResolver;

  async apply(): Promise<void> {
    try {
      const [[chainAddress, chainStatus], [lastSavedBlockId, lastSavedAnchor]] = await Promise.all([
        this.chainContract.resolveStatus(),
        BlockSynchronizer.getLastSavedBlockIdAndStartAnchor(),
      ]);

      if (!(await this.canProceed(chainStatus, lastSavedBlockId, lastSavedAnchor))) {
        return;
      }

      this.logger.info(`Synchronizing blocks for ${chainStatus.nextBlockId}, current chain ${chainAddress}`);

      const mongoBlocks = await this.getMongoBlocksToSynchronize();

      this.logger.info(`got ${mongoBlocks.length} mongoBlocks to synchronize`);

      const [leavesSynchronizers, blockIds] = await this.processBlocks(chainStatus, mongoBlocks);

      this.logger.info(`processing blocks done: ${blockIds.join(',')}`);

      let syncResults;
      try {
        syncResults = await Promise.all(leavesSynchronizers);
      } catch (e) {
        this.logger.error('[101]' + e.message, e);
      }

      this.logger.info(`syncing results: ${syncResults}`);

      if (blockIds.length > 0) {
        const saved = await this.updateSynchronizedBlocks(syncResults, blockIds);
        this.logger.info(`saved blocks: ${saved.map((b) => b.id)}`);
      }
    } catch (e) {
      this.logger.error('[99]' + e.message, e);
    }
  }

  static async getLastSavedBlockIdAndStartAnchor(): Promise<[number, number]> {
    const lastSavedBlock = await Block.find({}).sort({ blockId: -1 }).limit(1).exec();
    return lastSavedBlock[0]
      ? [lastSavedBlock[0].blockId, lastSavedBlock[0].anchor + 1]
      : [0, await BlockSynchronizer.getLowestChainAnchor()];
  }

  private async canProceed(
    chainStatus: ChainStatus,
    lastSavedBlockId: number,
    lastSavedAnchor: number
  ): Promise<boolean> {
    if ((await this.reveredBlockResolver.apply(lastSavedBlockId, chainStatus.nextBlockId)) > 0) {
      return false;
    }

    return BlockSynchronizer.newBlockDetected(chainStatus.blockNumber, lastSavedAnchor);
  }

  private static newBlockDetected(currentBlockchainBlockNumber: BigNumber, lastSavedAnchor: number): boolean {
    return !lastSavedAnchor || currentBlockchainBlockNumber.gt(lastSavedAnchor);
  }

  private static async getLowestChainAnchor(): Promise<number> {
    const oldestChain = await ChainInstance.find({}).limit(1).sort({ blockId: 1 }).exec();
    return oldestChain[0].anchor;
  }

  private async getMongoBlocksToSynchronize(): Promise<IBlock[]> {
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
      .limit(this.settings.blockchain.confirmations)
      .exec();

    return blocksInProgress.concat(blocksToConfirm);
  }

  private async updateSynchronizedBlocks(
    leavesSynchronizers: (boolean | null)[],
    blockIds: string[]
  ): Promise<IBlock[]> {
    return Promise.all(
      leavesSynchronizers
        .filter((success: boolean) => success !== null)
        .map((success: boolean, i: number) => {
          const status = success ? BlockStatus.Finalized : BlockStatus.Failed;

          this.logger.info(`updateSynchronizedBlocks ${blockIds[i]}: ${status}`);

          if (!success) {
            this.logger.error(`Block ${blockIds[i]}: ${status}`);
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
  }

  private async processBlocks(
    chainStatus: ChainStatus,
    mongoBlocks: IBlock[]
  ): Promise<[leavesSynchronizersStatus: Promise<boolean | null>[], synchronizedIds: string[]]> {
    const leavesSynchronizers: Promise<boolean | null>[] = [];
    const blockIds: string[] = [];
    let blocksWereReverted = false;

    await Promise.all(
      <Promise<never>[]>mongoBlocks.map(async (mongoBlock: IBlock) => {
        if (blocksWereReverted) {
          return;
        }

        this.logger.info(
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
            this.logger.info(`pulling onChainBlocksData for ${mongoBlock.blockId}: ${mongoBlock.chainAddress}`);

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
            this.logger.error(`Block ${mongoBlock._id} with odd status: ${mongoBlock.status}`);
            return;
        }
      })
    );

    return [leavesSynchronizers, blockIds];
  }

  private static async revertBlocks(
    blockId: number
  ): Promise<({ ok?: number; n?: number } & { deletedCount?: number })[]> {
    const condition = { blockId: { $gte: blockId } };
    return Promise.all([Block.deleteMany(condition), Leaf.deleteMany(condition)]);
  }
}

export default BlockSynchronizer;
