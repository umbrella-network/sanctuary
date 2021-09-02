import { BigNumber } from 'ethers';

export type ForeignChainStatus = {
  chainAddress: string;
  blockNumber: BigNumber;
  timePadding: number;
  lastDataTimestamp: number;
  lastId: number;
  nextBlockId: number;
}
