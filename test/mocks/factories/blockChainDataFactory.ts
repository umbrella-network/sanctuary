import { Factory } from 'rosie';
import { v4 } from 'uuid';
import Block, { IBlock } from '../../../src/models/Block';
import BlockChainData, { IBlockChainData } from '../../../src/models/BlockChainData';
import { blockFactory } from './blockFactory';
import { BlockStatus } from '@umb-network/toolbox/dist/types/BlockStatuses';

export const blockChainDataFactory = Factory.define('BlockChainData')
  .attr('_id', () => v4())
  .attr('chainAddress', 'CHAIN_ADDRESS')
  .attr('chainId', 'ethereum')
  .attr('minter', 'MINTER')
  .sequence('blockId')
  .sequence('anchor');

export const createBlockFromBlockChainData = async (): Promise<{ blockChainData: IBlockChainData; block: IBlock }> => {
  const blockChainData = new BlockChainData(blockChainDataFactory.build({ status: BlockStatus.Finalized }));
  await blockChainData.save();

  const block = new Block(blockFactory.build({ blockId: blockChainData.blockId, status: BlockStatus.Finalized }));
  await block.save();

  return { blockChainData, block };
};
