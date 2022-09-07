import { BlockStatus } from '../../src/types/blocks';

export const inputForBlockModel = {
  _id: 'block::1',
  blockId: 1,
  power: '1000000000000000000',
  // correct root hash if ETH-USD === SortedMerkleTree.squashRoot('0x' + LeafValueCoder.encode(100).toString('hex'), timestamp)
  root: '0xd4dd03cde5bf7478f1cce81433ef917cdbd235811769bc3495ab6ab4600b6395',
  staked: '1000000000000000000',
  status: BlockStatus.Finalized,
  dataTimestamp: new Date(1611359125000),
  voters: ['0xA405324F4b6EB7Bc76f1964489b3769cfc71445F'],
  votes: new Map([['0xA405324F4b6EB7Bc76f1964489b3769cfc71445F', '1000000000000000000']]),
};

export const inputForBlockChainDataModel = {
  _id: 'block::bsc::1',
  chainAddress: '0x1',
  chainId: 'bsc',
  anchor: 1024,
  blockId: 1,
  minter: '0xA405324F4b6EB7Bc76f1964489b3769cfc71445F',
};

export const chainAddress = '0xA6f3317483048B095691b8a8CE0C57077a378689';

export const randomBlocks = [
  {
    _id: 'block::1',
    chainAddress,
    anchor: 5,
    blockId: 1,
    minter: '0xA405324F4b6EB7Bc76f1964489b3769cfc71445F',
    power: '1000000000000000000',
    // correct root hash if ETH-USD === '0x' + LeafValueCoder.encode(100).toString('hex')
    root: '0xd4dd03cde5bf7478f1cce81433ef917cdbd235811769bc3495ab6ab49aada5a6',
    staked: '1000000000000000000',
    status: BlockStatus.Finalized,
    dataTimestamp: new Date(1611359125000),
    voters: ['0xA405324F4b6EB7Bc76f1964489b3769cfc71445F'],
    votes: new Map([['0xA405324F4b6EB7Bc76f1964489b3769cfc71445F', '1000000000000000000']]),
  },
  {
    _id: 'block::2',
    chainAddress,
    anchor: 7,
    blockId: 2,
    minter: '0xA405324F4b6EB7Bc76f1964489b3769cfc71445F',
    power: '1000000000000000000',
    // correct root hash if ETH-USD === '0x' + LeafValueCoder.encode(100).toString('hex')
    root: '0xd4dd03cde5bf7478f1cce81433ef917cdbd235811769bc3495ab6ab49aada5a6',
    staked: '1000000000000000000',
    status: BlockStatus.Completed,
    dataTimestamp: new Date(1611359126000),
    voters: ['0xA405324F4b6EB7Bc76f1964489b3769cfc71445F'],
    votes: new Map([['0xA405324F4b6EB7Bc76f1964489b3769cfc71445F', '1000000000000000000']]),
  },
  {
    _id: 'block::3',
    chainAddress,
    anchor: 9,
    blockId: 3,
    minter: '0xA405324F4b6EB7Bc76f1964489b3769cfc71445F',
    power: '1000000000000000000',
    // invalid root
    root: '0xd4dd03cde5bf7478f1cce81433ef917cdbd235811769bc3495ab6ab49aada5a4',
    staked: '1000000000000000000',
    status: BlockStatus.Failed,
    dataTimestamp: new Date(1611359127000),
    voters: ['0xA405324F4b6EB7Bc76f1964489b3769cfc71445F'],
    votes: new Map([['0xA405324F4b6EB7Bc76f1964489b3769cfc71445F', '1000000000000000000']]),
  },
];
