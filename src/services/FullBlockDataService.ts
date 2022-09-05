import { injectable } from 'inversify';
import { IBlock } from '../models/Block';
import { IBlockChainData } from '../models/BlockChainData';
import { FullBlockData } from '../types/blocks';

@injectable()
export class FullBlockDataService {
  transformMany(blocks: IBlock[], blockChainData: IBlockChainData[]): FullBlockData[] {
    return blocks.map((block) => {
      const matchingBlockChainData = blockChainData.find((fb) => fb.blockId == block.blockId);
      return this.transformOne(block, matchingBlockChainData);
    });
  }

  transformOne(block: IBlock, blockChainData: IBlockChainData): FullBlockData {
    return {
      _id: block._id,
      blockId: block.blockId,
      status: block.status,
      dataTimestamp: block.dataTimestamp,
      root: block.root,
      staked: block.staked,
      power: block.power,
      voters: block.voters,
      votes: block.votes,
      chainAddress: blockChainData.chainAddress,
      anchor: blockChainData.anchor,
      minter: blockChainData.minter,
    };
  }
}
