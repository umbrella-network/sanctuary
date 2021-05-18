import { CreateQuery } from 'mongoose';
import { IBlock } from '../../src/models/Block';

export const inputForBlockModel: CreateQuery<IBlock> = {
  _id: 'block::1',
  chainAddress: '0x1',
  anchor: '1024',
  blockId: 1,
  minter: '0xA405324F4b6EB7Bc76f1964489b3769cfc71445F',
  power: '1000000000000000000',
  // correct root hash if ETH-USD === '0x' + LeafValueCoder.encode(100, LeafType.TYPE_FLOAT).toString('hex')
  root: '0xbc0c5f121772154318bb0300d7a54affeabe880cd746f291da84c8b9312c25a9',
  staked: '1000000000000000000',
  status: 'finalized',
  dataTimestamp: new Date(1611359125000),
  voters: ['0xA405324F4b6EB7Bc76f1964489b3769cfc71445F'],
  votes: new Map([
    ['0xA405324F4b6EB7Bc76f1964489b3769cfc71445F', '1000000000000000000']
  ])
};
