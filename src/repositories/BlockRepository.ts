import { inject, injectable } from 'inversify';
import { isUndefined, omitBy } from 'lodash';
import { Logger } from 'winston';

import Block, { IBlock } from '../models/Block';
import BlockChainData, { IBlockChainData } from '../models/BlockChainData';
import { BlockStatus, FullBlockData } from '../types/blocks';
import Settings from '../types/Settings';

export type FindProps = {
  offset: number;
  limit: number;
  chainId?: string;
  sort?: Record<string, unknown>;
};

export type FindOneProps = {
  blockId: number;
  chainId?: string;
};

export type LatestProps = {
  chainId: string;
  status?: BlockStatus;
};

export type CountBlocksBetweenProps<T> = {
  startDate: T;
  endDate: T;
};

@injectable()
export class BlockRepository {
  @inject('Logger') protected logger!: Logger;
  @inject('Settings') protected settings!: Settings;

  async find(props: FindProps): Promise<FullBlockData[]> {
    const { chainId, offset, limit, sort = { blockId: -1 } } = props;

    const blockChainData: IBlockChainData[] = await BlockChainData.find({ chainId })
      .skip(offset)
      .limit(limit)
      .sort(sort)
      .exec();

    const blocks = await Block.find({ blockId: { $in: blockChainData.map((fb) => fb.blockId) } })
      .sort(sort)
      .exec();

    return this.augmentBlockCollectionWithReplicationData(blocks, blockChainData);
  }

  async findOne(props: FindOneProps): Promise<FullBlockData | undefined> {
    const { blockId, chainId } = props;

    const blockChainData = await BlockChainData.findOne({ blockId, chainId });
    const block = await Block.findOne({ blockId });
    if (!block || !blockChainData) return;

    return this.augmentBlockWithReplicationData(block, blockChainData);
  }

  async findLatest(props: LatestProps): Promise<FullBlockData | undefined> {
    const { chainId, status } = props;

    try {
      const blockChainData = await BlockChainData.findOne({ chainId }).sort({ blockId: -1 });
      const query = omitBy({ blockId: blockChainData.blockId, status }, isUndefined);
      const block = await Block.findOne(query);
      if (!block || !blockChainData) return;

      return this.augmentBlockWithReplicationData(block, blockChainData);
    } catch (e) {
      this.logger.error(`unable to find latest block for chainId ${chainId} and status ${status}`);
      throw e;
    }
  }

  async getLatestBlock(): Promise<IBlock> {
    const block = await Block.find().sort('-blockId').limit(1);

    return block[0];
  }

  async countBlocksFromPeriod({ startDate, endDate }: CountBlocksBetweenProps<Date>): Promise<number> {
    return Block.find({
      dataTimestamp: {
        $gte: startDate,
        $lt: endDate,
      },
      status: BlockStatus.Finalized,
    }).countDocuments();
  }

  private augmentBlockCollectionWithReplicationData(
    blocks: IBlock[],
    blockChainData: IBlockChainData[]
  ): FullBlockData[] {
    return blocks.map((block) => {
      const matchingBlockChainData = blockChainData.find((fb) => fb.blockId == block.blockId);
      return this.augmentBlockWithReplicationData(block, matchingBlockChainData);
    });
  }

  private augmentBlockWithReplicationData(block: IBlock, blockChainData: IBlockChainData): FullBlockData {
    block.chainAddress = blockChainData.chainAddress;
    block.anchor = blockChainData.anchor;
    block.minter = blockChainData.minter;
    return block;
  }
}
