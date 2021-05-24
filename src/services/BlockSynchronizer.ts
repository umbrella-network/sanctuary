import { Logger } from 'winston';
import { inject, injectable } from 'inversify';
import ChainContract from '../contracts/ChainContract';
import Block, { IBlock } from '../models/Block';
import Leaf from '../models/Leaf';
import LeavesSynchronizer from '../services/LeavesSynchronizer';
import { ChainBlockData, ChainBlockDataExtended } from '../models/ChainBlockData';
import ChainInstance, { IChainInstance } from '../models/ChainInstance';
import { ethers } from 'ethers';
import { BlockStatus } from '../types/BlockStatuses';
import { ChainInstanceResolver } from './ChainInstanceResolver';
import { ChainStatus } from '../types/ChainStatus';
import RevertedBlockResolver from './RevertedBlockResolver';

@injectable()
class BlockSynchronizer {
  @inject('Logger') private logger!: Logger;
  @inject(ChainContract) private chainContract!: ChainContract;
  @inject(ChainInstanceResolver) private chainInstanceResolver!: ChainInstanceResolver;
  @inject(LeavesSynchronizer) private leavesSynchronizer!: LeavesSynchronizer;
  @inject(RevertedBlockResolver) reveredBlockResolver!: RevertedBlockResolver;

  async apply(): Promise<void> {
    const [[chainAddress, chainStatus], earliestChainOffset, lastSavedBlockId] = await Promise.all([
      this.chainContract.resolveStatus(),
      this.getEarliestChainOffset(),
      this.getLastSavedBlockId(),
    ]);

    if ((await this.reveredBlockResolver.apply(lastSavedBlockId, chainStatus.nextBlockId)) > 0) {
      return;
    }

    const loopBack = this.calculateLookBack(earliestChainOffset, lastSavedBlockId, chainStatus.nextBlockId);

    this.logger.info(
      `Synchronizing blocks for ${chainStatus.nextBlockId}, loopback=${loopBack}, current chain ${chainAddress}`
    );

    const onChainBlocksData: ChainBlockDataExtended[] = await this.mintedBlocksFromChain(
      chainStatus.nextBlockId,
      loopBack
    );

    this.logger.debug(`got ${onChainBlocksData.length} onChainBlocks`);

    const mongoBlocks = await this.getMongoBlocks(onChainBlocksData);

    this.logger.debug(`updated ${mongoBlocks.length} mongoBlocks`);

    const [leavesSynchronizers, blockIds] = await this.processBlocks(chainStatus, mongoBlocks, onChainBlocksData);

    if (blockIds.length > 0) {
      this.logger.info(`Synchronizing leaves for completed blocks: ${blockIds.join(',')}`);
      await this.updateSynchronizedBlocks(await Promise.all(leavesSynchronizers), blockIds);
    }
  }

  private calculateLookBack(earliestChainOffset: number, lastSavedBlockId: number, currentBlockId: number): number {
    if (earliestChainOffset < 0) {
      throw Error('looks like there is no Chain Instance');
    }

    if (lastSavedBlockId === 0) {
      return currentBlockId - earliestChainOffset;
    }

    return Math.min(currentBlockId - earliestChainOffset, currentBlockId - lastSavedBlockId + 10);
  }

  private async getLastSavedBlockId(): Promise<number> {
    const lastSavedBlock = await Block.find({}).limit(1).sort({ blockId: -1 }).exec();
    return lastSavedBlock[0] ? lastSavedBlock[0].blockId : 0;
  }

  private async getEarliestChainOffset(): Promise<number> {
    const offsets = await ChainInstance.find({}).limit(1).sort({ blocksCountOffset: 1 }).exec();
    return offsets[0] ? offsets[0].blocksCountOffset : -1;
  }

  private getMongoBlocks(onChainBlocksData: ChainBlockDataExtended[]): Promise<IBlock[]> {
    return Promise.all(
      onChainBlocksData.map((onChainBlockData) => {
        const dataTimestamp = new Date(onChainBlockData.dataTimestamp * 1000);

        return Block.findOneAndUpdate(
          {
            _id: `block::${onChainBlockData.blockId}`,
            blockId: onChainBlockData.blockId,
          },
          {
            chainAddress: onChainBlockData.chainInstance.address,
            root: onChainBlockData.root,
            dataTimestamp: dataTimestamp,
          },
          {
            new: true,
            upsert: true,
          }
        );
      })
    );
  }

  private async updateSynchronizedBlocks(
    leavesSynchronizers: (boolean | null)[],
    blockIds: string[]
  ): Promise<IBlock[]> {
    return Promise.all(
      leavesSynchronizers
        .filter((success: boolean) => success !== null)
        .map((success: boolean, i: number) =>
          Block.findOneAndUpdate(
            { _id: blockIds[i] },
            {
              status: success ? BlockStatus.Finalized : BlockStatus.Failed,
            },
            {
              new: false,
              upsert: true,
            }
          )
        )
    );
  }

  private async processBlocks(
    chainStatus: ChainStatus,
    mongoBlocks: IBlock[],
    onChainBlocksData: ChainBlockDataExtended[]
  ): Promise<[leavesSynchronizersSuccesses: Promise<boolean | null>[], blockIds: string[]]> {
    const leavesSynchronizers: Promise<boolean | null>[] = [];
    const blockIds: string[] = [];

    await Promise.all(
      <Promise<never>[]>mongoBlocks.map((mongoBlock: IBlock, i: number) => {
        this.logger.debug(
          `Block ${mongoBlock._id} with dataTimestamp: ${mongoBlock.dataTimestamp} and status: ${mongoBlock.status}`
        );

        switch (mongoBlock.status) {
          case undefined:
            this.logger.info(`New block detected: ${mongoBlock._id}`);
            mongoBlock.status = BlockStatus.New;
            return mongoBlock.save();

          case BlockStatus.New:
            if (onChainBlocksData[i].root !== ethers.constants.HashZero) {
              return this.syncFinished(onChainBlocksData[i], mongoBlock._id);
            }

            this.logger.info(`Block is not just finished: ${mongoBlock._id}`);
            return;

          case BlockStatus.Completed:
            this.logger.info(`Start synchronizing leaves for completed block: ${mongoBlock.blockId}`);
            blockIds.push(mongoBlock._id);
            leavesSynchronizers.push(this.leavesSynchronizer.apply(chainStatus, mongoBlock._id));
            return;

          case BlockStatus.Finalized:
          case BlockStatus.Failed:
            if (mongoBlock.root != onChainBlocksData[i].root) {
              this.logger.warn(
                `Invalid ROOT for blockId ${mongoBlock.blockId}. Expected ${onChainBlocksData[i].root} but have ${mongoBlock.root} Reverting`
              );
              return this.revertBlock(mongoBlock._id);
            }

            return;

          default:
            return;
        }
      })
    );

    return [leavesSynchronizers, blockIds];
  }

  private async mintedBlocksFromChain(currentBlockId: number, lookBack = 10): Promise<ChainBlockDataExtended[]> {
    const awaitChainInstances: Promise<IChainInstance | undefined>[] = [];

    for (let blockId = currentBlockId - lookBack; blockId <= currentBlockId; blockId++) {
      awaitChainInstances.push(this.chainInstanceResolver.apply(blockId));
    }

    const chainInstances = await Promise.all(awaitChainInstances);

    const data = chainInstances
      .filter((instance) => !!instance)
      .map((chainInstance: IChainInstance, i: number) =>
        this.chainContract.resolveBlockData(chainInstance.address, currentBlockId - lookBack + i)
      );

    return (await Promise.all(data)).map(
      (blockData: ChainBlockData, i: number) =>
        <ChainBlockDataExtended>{
          ...blockData,
          blockId: currentBlockId - lookBack + i,
          chainInstance: chainInstances[i],
        }
    );
  }

  private async revertBlock(blockId: string): Promise<({ ok?: number; n?: number } & { deletedCount?: number })[]> {
    return Promise.all([Block.deleteOne({ _id: blockId }), Leaf.deleteMany({ blockId })]);
  }

  private async syncFinished(blockData: ChainBlockDataExtended, id: string): Promise<IBlock | void> {
    const block = await Block.findOne({ _id: id });
    const blockId = block.blockId;

    const status = blockData.root == ethers.constants.HashZero ? BlockStatus.Failed : BlockStatus.Completed;

    if (status === BlockStatus.Failed) {
      this.logger.info(`Block ${blockId} [${JSON.stringify(blockData)}] has finished with status: ${block.status}`);
    }

    return block.updateOne({ status: status });
    // TODO when we switch to archive node, we can pull all data about voters, powers etc
    // atm we will pull it from validators as this is the easiest way
  }
}

export default BlockSynchronizer;
