import { Factory } from 'rosie';
import { v4 } from 'uuid';

export const foreignBlockFactory = Factory
  .define('ForeignBlock')
  .attr('_id', () => v4())
  .attr('chainAddress', 'CHAIN_ADDRESS')
  .attr('chainId', 'ethereum')
  .sequence('blockId')
  .sequence('anchor')
  .attr('foreignChainId', 'ethereum');
