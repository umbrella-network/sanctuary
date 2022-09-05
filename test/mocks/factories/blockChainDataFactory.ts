import { Factory } from 'rosie';
import { v4 } from 'uuid';
import settings from '../../../src/config/settings';
import Block, { IBlock } from '../../../src/models/Block';
import BlockChainData, { IBlockChainData } from '../../../src/models/BlockChainData';
import { blockFactory } from './blockFactory';

export const blockChainDataFactory = Factory.define('BlockChainData')
  .attr('_id', () => v4())
  .attr('chainAddress', 'CHAIN_ADDRESS')
  .attr('chainId', settings.blockchain.homeChain.chainId)
  .attr('minter', 'MINTER')
  .sequence('blockId')
  .sequence('anchor');

export const createBlockFromBlockChainData = async (): Promise<{ blockChainData: IBlockChainData; block: IBlock }> => {
  const blockChainData = new BlockChainData(blockChainDataFactory.build());
  await blockChainData.save();

  const block = new Block(blockFactory.build({ blockId: blockChainData.blockId }));
  await block.save();

  return { blockChainData, block };
};
