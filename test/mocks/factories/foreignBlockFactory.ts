import { Factory } from 'rosie';
import { v4 } from 'uuid';
import Block, { IBlock } from '../../../src/models/Block';
import ForeignBlock, { IForeignBlock } from '../../../src/models/ForeignBlock';
import { blockFactory } from './blockFactory';

export const foreignBlockFactory = Factory.define('ForeignBlock')
  .attr('_id', () => v4())
  .attr('chainAddress', 'CHAIN_ADDRESS')
  .attr('chainId', 'ethereum')
  .attr('minter', 'MINTER')
  .sequence('blockId')
  .sequence('anchor')
  .attr('foreignChainId', 'ethereum');

export const createBlockFromForeignBlock = async (): Promise<{ foreignBlock: IForeignBlock; block: IBlock }> => {
  const foreignBlock = new ForeignBlock(foreignBlockFactory.build());
  await foreignBlock.save();

  const block = new Block(blockFactory.build({ blockId: foreignBlock.blockId }));
  await block.save();

  return { foreignBlock, block };
};
