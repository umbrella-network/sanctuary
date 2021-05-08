import { Logger } from 'winston';
import { inject, injectable } from 'inversify';
import ChainContract from '../contracts/ChainContract';
import Block, { IBlock } from '../models/Block';
import Leaf from '../models/Leaf';
import LeavesSynchronizer from '../services/LeavesSynchronizer';
import { ChainBlockData, ChainBlockDataExtended } from '../models/ChainBlockData';
import { IChainInstance } from '../models/ChainInstance';
import { BigNumber, ethers } from 'ethers';
import { BlockStatus } from '../types/BlockStatuses';
import { ChainInstanceResolver } from './ChainInstanceResolver';

@injectable()
class BlockSynchronizer {
  @inject('Logger') private logger!: Logger;
  @inject(ChainContract) private chainContract!: ChainContract;
  @inject(ChainInstanceResolver) private chainInstanceResolver!: ChainInstanceResolver;
  @inject(LeavesSynchronizer) private leavesSynchronizer!: LeavesSynchronizer;

  async apply(): Promise<void> {
    const currentContract = await this.chainContract.resolveContract();
    const currentBlockHeight = (await currentContract.getBlockHeight()).toNumber();

    this.logger.info(
      `Synchronizing blocks starting at current height: ${currentBlockHeight} based on current chain ${this.chainContract.address()}`
    );

    const onChainBlocksData: ChainBlockDataExtended[] = await this.mintedBlocksFromChain(currentBlockHeight, 10);

    this.logger.debug(`got ${onChainBlocksData.length} onChainBlocks`);

    const mongoBlocks = await this.getMongoBlocks(onChainBlocksData);

    this.logger.debug(`updated ${mongoBlocks.length} mongoBlocks`);

    const [leavesSynchronizers, blockIds] = await this.processBlocks(
      currentBlockHeight,
      mongoBlocks,
      onChainBlocksData
    );

    if (blockIds.length > 0) {
      this.logger.info(`Synchronizing leaves for completed blocks: ${blockIds.join(',')}`);
      await this.updateSynchronizedBlocks(await Promise.all(leavesSynchronizers), blockIds);
    }
  }

  private getMongoBlocks(onChainBlocksData: ChainBlockDataExtended[]): Promise<IBlock[]> {
    return Promise.all(
      onChainBlocksData.map((onChainBlockData) => {
        const timestamp = new Date(onChainBlockData.timestamp * 1000);

        return Block.findOneAndUpdate(
          {
            _id: `block::${onChainBlockData.height}`,
            height: onChainBlockData.height,
          },
          {
            chainAddress: onChainBlockData.chainInstance.address,
            anchor: onChainBlockData.anchor.toString(),
            root: onChainBlockData.root,
            timestamp,
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
    currentBlockHeight: number,
    mongoBlocks: IBlock[],
    onChainBlocksData: ChainBlockDataExtended[]
  ): Promise<[leavesSynchronizersSuccesses: Promise<boolean | null>[], blockIds: string[]]> {
    const leavesSynchronizers: Promise<boolean | null>[] = [];
    const blockIds: string[] = [];

    await Promise.all(
      <Promise<never>[]>mongoBlocks.map((mongoBlock: IBlock, i: number) => {
        this.logger.debug(
          `Block ${mongoBlock.id} with height: ${mongoBlock.height} and anchor: ${mongoBlock.anchor} and timestamp: ${mongoBlock.timestamp} and status: ${mongoBlock.status}`
        );

        switch (mongoBlock.status) {
          case undefined:
            this.logger.info(`New block detected: ${mongoBlock.id}`);
            mongoBlock.status = BlockStatus.New;
            return mongoBlock.save();

          case BlockStatus.New:
            if (onChainBlocksData[i].root !== ethers.constants.HashZero) {
              return this.syncFinished(onChainBlocksData[i], mongoBlock.id);
            }

            this.logger.info(`Block is not just finished: ${mongoBlock.id}`);
            return;

          case BlockStatus.Completed:
            this.logger.info(`Synchronizing leaves for completed block: ${mongoBlock.height}`);
            blockIds.push(mongoBlock.id);
            leavesSynchronizers.push(this.leavesSynchronizer.apply(currentBlockHeight, mongoBlock.id));
            return;

          case BlockStatus.Finalized:
          case BlockStatus.Failed:
            if (mongoBlock.root != onChainBlocksData[i].root) {
              this.logger.warn(
                `Invalid ROOT for block height ${mongoBlock.height}. Expected ${onChainBlocksData[i].root} but have ${mongoBlock.root} Reverting`
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

  private async mintedBlocksFromChain(blockHeight: number, lookBack = 10): Promise<ChainBlockDataExtended[]> {
    const awaitChainInstances: Promise<IChainInstance | undefined>[] = [];

    for (let height = blockHeight - lookBack; height <= blockHeight; height++) {
      awaitChainInstances.push(this.chainInstanceResolver.apply(height));
    }

    const chainInstances = await Promise.all(awaitChainInstances);

    const data = chainInstances.map((chainInstance: IChainInstance, i: number) =>
      this.chainContract.resolveBlockData(chainInstance.address, blockHeight - lookBack + i)
    );

    return (await Promise.all(data)).map(
      (blockData: ChainBlockData, i: number) =>
        <ChainBlockDataExtended>{
          ...blockData,
          height: blockHeight - lookBack + i,
          chainInstance: chainInstances[i],
        }
    );
  }

  private async revertBlock(blockId: string): Promise<({ ok?: number; n?: number } & { deletedCount?: number })[]> {
    return Promise.all([Block.deleteOne({ _id: blockId }), Leaf.deleteMany({ blockId })]);
  }

  private async syncFinished(blockData: ChainBlockDataExtended, id: string): Promise<IBlock | void> {
    const block = await Block.findOne({ _id: id });
    const height = block.height;

    const status = blockData.root == ethers.constants.HashZero ? BlockStatus.Failed : BlockStatus.Completed;

    if (status === BlockStatus.Failed) {
      this.logger.info(`Block ${height} [${JSON.stringify(blockData)}] has finished with status: ${block.status}`);
      return block.updateOne({ status: status });
    }

    const voters = await this.chainContract.resolveBlockVoters(blockData.chainInstance.address, height);
    const votes = await this.getVotes(blockData.chainInstance, height, voters);

    this.logger.info(`Syncing finished side block with votes: ${JSON.stringify([...votes.entries()])}`);
    this.logger.info(`Block ${height} has finished: ${JSON.stringify(blockData)} with status: ${block.status}`);

    return block.updateOne({
      status: status,
      root: blockData.root,
      minter: blockData.minter,
      staked: blockData.staked.toString(),
      power: blockData.power.toString(),
      voters: voters,
      votes,
    });
  }

  private async getVotes(
    chainInstance: IChainInstance,
    blockHeight: number,
    voters: string[]
  ): Promise<Map<string, string>> {
    const votes: BigNumber[] = await Promise.all(
      voters.map((voter) => this.chainContract.resolveBlockVotes(chainInstance.address, blockHeight, voter))
    );

    const votesMap = new Map<string, string>();

    voters.forEach((voter, i) => {
      votesMap.set(voter, votes[i].toString());
    });

    return votesMap;
  }
}

export default BlockSynchronizer;
