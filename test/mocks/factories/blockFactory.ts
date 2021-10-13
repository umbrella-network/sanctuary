import { Factory } from 'rosie';
import { v4 } from 'uuid';

export const blockFactory = Factory.define('ForeignBlock')
  .attr('_id', () => v4())
  .sequence('blockId')
  .sequence('anchor')
  .attr('chainAddress', 'CHAIN_ADDRESS')
  .attr('root', 'ROOT')
  .sequence('anchor')
  .attr('dataTimestamp', () => new Date())
  .attr('minter', 'MINTER')
  .attr('staked', 'STAKED')
  .attr('power', 'POWER');
