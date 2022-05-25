import { BlockStatus } from '../../src/types/blocks';

export const inputForBlockModel = {
  _id: 'block::1',
  chainAddress: '0x1',
  anchor: 1024,
  blockId: 1,
  minter: '0xA405324F4b6EB7Bc76f1964489b3769cfc71445F',
  power: '1000000000000000000',
  // correct root hash if ETH-USD === SortedMerkleTree.squashRoot('0x' + LeafValueCoder.encode(100).toString('hex'), timestamp)
  root: '0xd4dd03cde5bf7478f1cce81433ef917cdbd235811769bc3495ab6ab4600b6395',
  staked: '1000000000000000000',
  status: BlockStatus.Finalized,
  dataTimestamp: new Date(1611359125000),
  voters: ['0xA405324F4b6EB7Bc76f1964489b3769cfc71445F'],
  votes: new Map([['0xA405324F4b6EB7Bc76f1964489b3769cfc71445F', '1000000000000000000']]),
};
