import { injectable } from 'inversify';
import Block, { IBlock } from '../models/Block';
import ForeignBlock, { IForeignBlock } from '../models/ForeignBlock';
import { BlockStatus } from '../types/blocks';
import { isUndefined, omitBy } from 'lodash';

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

@injectable()
export class BlockRepository {
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
      const foreignBlock = await ForeignBlock.findOne({ foreignChainId: chainId }).sort({ blockId: -1 });
      const query = omitBy({ blockId: foreignBlock.blockId, status }, isUndefined);
      const block = await Block.findOne(query);
      if (!block || !foreignBlock) return;

      return this.augmentBlockWithReplicationData(block, foreignBlock);
    } else {
      const query = omitBy({ status }, isUndefined);
      return Block.findOne(query).sort({ blockId: -1 });
    }
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
