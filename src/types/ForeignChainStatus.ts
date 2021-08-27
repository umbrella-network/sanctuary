import { BigNumber } from 'ethers';

export type ForeignChainStatus = {
  chainAddress: string;
  blockNumber: BigNumber;
  timePadding: number;
  lastDataTimestamp: number;
  lastBlockId: number;
  nextBlockId: number;
}
