import { Factory } from 'rosie';
import { v4 } from 'uuid';

import Block from '../../../src/models/Block';
import Leaf from '../../../src/models/Leaf';
import { inputForBlockModel } from '../../fixtures/inputForBlockModel';

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

export const blockAndLeafFactory = async (): Promise<void> => {
  await Block.create([
    { ...inputForBlockModel, _id: 'block::1', blockId: 1 },
    { ...inputForBlockModel, _id: 'block::2', blockId: 2 },
    { ...inputForBlockModel, _id: 'block::3', blockId: 3 },
    { ...inputForBlockModel, _id: 'block::4', blockId: 4 },
  ]);

  await Leaf.create([
    { _id: 'leaf::block::1::a', blockId: 1, key: 'a', value: '0x0', proof: ['proof1'] },
    { _id: 'leaf::block::1::b', blockId: 1, key: 'b', value: '0x0', proof: ['proof2'] },
    { _id: 'leaf::block::2::a', blockId: 2, key: 'a', value: '0x0', proof: ['proof3'] },
    { _id: 'leaf::block::2::b', blockId: 2, key: 'b', value: '0x0', proof: ['proof4'] },
    { _id: 'leaf::block::3::a', blockId: 3, key: 'a', value: '0x0', proof: ['proof5'] },
    { _id: 'leaf::block::4::a', blockId: 4, key: 'a', value: '0x0', proof: ['proof6'] },
  ]);
};
