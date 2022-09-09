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
    const { chainId = this.settings.blockchain.homeChain.chainId, offset, limit, sort = { blockId: -1 } } = props;

    const blockChainData: IBlockChainData[] = await BlockChainData.find({ chainId, status: BlockStatus.Finalized })
      .skip(offset)
      .limit(limit)
      .sort(sort)
      .exec();

    if (blockChainData.length == 0) {
      return [];
    }

    const blocks = await Block.find({ blockId: { $in: blockChainData.map((fb) => fb.blockId) } })
      .sort(sort)
      .exec();

    return this.augmentBlockCollectionWithReplicationData(blocks, blockChainData);
  }

  async findOne(props: FindOneProps): Promise<FullBlockData | undefined> {
    const { blockId, chainId = this.settings.blockchain.homeChain.chainId } = props;

    const [block, blockChainData] = await Promise.all([
      Block.findOne({ blockId }),
      BlockChainData.findOne({ blockId, chainId }),
    ]);

    if (!block || !blockChainData) return;

    return this.augmentBlockWithReplicationData(block, blockChainData);
  }

  async findLatest(props: LatestProps): Promise<FullBlockData | undefined> {
    const { chainId, status } = props;

    try {
      const queryData = omitBy({ chainId, status }, isUndefined);
      const blockChainData = await BlockChainData.findOne(queryData).sort({ blockId: -1 });
      if (!blockChainData) return;

      const block = await Block.findOne({ blockId: blockChainData.blockId });
      if (!block) return;

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
    const map: Record<number, IBlockChainData> = {};

    blockChainData.forEach((b) => {
      map[b.blockId] = b;
    });

    return blocks.map((block) => {
      const matchingBlockChainData = map[block.blockId];

      if (!matchingBlockChainData) {
        this.logger.error(`No matching Block for blockId: ${block.blockId}`);
        return undefined;
      }

      return this.augmentBlockWithReplicationData(block, matchingBlockChainData);
    }).filter(b => b);
  }

  private augmentBlockWithReplicationData(block: IBlock, blockChainData: IBlockChainData): FullBlockData {
    if (block.blockId != blockChainData.blockId) {
      const msg = `block data does not match: ${block.blockId} vs ${blockChainData.blockId}`;
      this.logger.error(msg);
      throw new Error(msg);
    }

    return {
      _id: blockChainData._id,
      chainAddress: blockChainData.chainAddress,
      blockId: block.blockId,
      status: block.status,
      anchor: blockChainData.anchor,
      dataTimestamp: block.dataTimestamp,
      root: block.root,
      minter: blockChainData.minter,
      staked: block.staked,
      power: block.power,
      voters: block.voters,
      votes: block.votes,
    };
  }
}
