import { inject, injectable } from 'inversify';
import { isUndefined, omitBy } from 'lodash';
import { Logger } from 'winston';

import Block, { IBlock } from '../models/Block';
import ForeignBlock, { IForeignBlock } from '../models/ForeignBlock';
import { BlockStatus } from '../types/blocks';

export type FindProps = {
  offset: number;
  limit: number;
  chainId?: string;
};

export type FindOneProps = {
  blockId: number;
  chainId?: string;
};

export type LatestProps = {
  chainId?: string;
  status?: BlockStatus;
};

export type CountBlocksBetweenProps<T> = {
  startDate: T;
  endDate: T;
};

@injectable()
export class BlockRepository {
  @inject('Logger') protected logger!: Logger;

  async find(props: FindProps): Promise<IBlock[]> {
    const { chainId, offset, limit } = props;

    if (chainId) {
      const foreignBlocks: IForeignBlock[] = await ForeignBlock.find({ foreignChainId: chainId })
        .skip(offset)
        .limit(limit)
        .sort({ blockId: -1 })
        .exec();

      const blocks = await Block.find({ blockId: { $in: foreignBlocks.map((fb) => fb.blockId) } })
        .sort({ blockId: -1 })
        .exec();

      return this.augmentBlockCollectionWithReplicationData(blocks, foreignBlocks);
    } else {
      return Block.find({ status: { $in: [BlockStatus.Finalized] } })
        .skip(offset)
        .limit(limit)
        .sort({ blockId: -1 })
        .exec();
    }
  }

  async findOne(props: FindOneProps): Promise<IBlock | undefined> {
    const { blockId, chainId } = props;

    if (chainId) {
      const foreignBlock = await ForeignBlock.findOne({ blockId, foreignChainId: chainId });
      const block = await Block.findOne({ blockId });
      if (!block || !foreignBlock) return;

      return this.augmentBlockWithReplicationData(block, foreignBlock);
    } else {
      return Block.findOne({ blockId });
    }
  }

  async findLatest(props: LatestProps): Promise<IBlock | undefined> {
    const { chainId, status } = props;

    if (chainId) {
      try {
        const foreignBlock = await ForeignBlock.findOne({ foreignChainId: chainId }).sort({ blockId: -1 });
        const query = omitBy({ blockId: foreignBlock.blockId, status }, isUndefined);
        const block = await Block.findOne(query);
        if (!block || !foreignBlock) return;

        return this.augmentBlockWithReplicationData(block, foreignBlock);
      } catch (e) {
        this.logger.error(`unable to find latest block for chainId ${chainId} and status ${status}`);
        throw e;
      }
    } else {
      const query = omitBy({ status }, isUndefined);
      return Block.findOne(query).sort({ blockId: -1 });
    }
  }

  async getLatestBlock(): Promise<IBlock> {
    const block = await Block.find().sort('-blockId').limit(1);

    return block[0];
  }

  async countBlocksFromPeriod({ startDate, endDate }: CountBlocksBetweenProps<Date>): Promise<number> {
    return Block.find({
      status: BlockStatus.Finalized,
      dataTimestamp: {
        $gte: startDate,
        $lt: endDate,
      },
    }).countDocuments();
  }

  private augmentBlockCollectionWithReplicationData(blocks: IBlock[], foreignBlocks: IForeignBlock[]): IBlock[] {
    return blocks.map((block) => {
      const matchingForeignBlock = foreignBlocks.find((fb) => fb.blockId == block.blockId);
      return this.augmentBlockWithReplicationData(block, matchingForeignBlock);
    });
  }

  private augmentBlockWithReplicationData(block: IBlock, foreignBlock: IForeignBlock): IBlock {
    block.chainAddress = foreignBlock.chainAddress;
    block.anchor = foreignBlock.anchor;
    block.minter = foreignBlock.minter;
    return block;
  }
}
