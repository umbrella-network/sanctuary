import { BigNumber } from 'ethers';

export type ForeignChainStatus = {
  blockNumber: BigNumber;
  timePadding: number;
  lastDataTimestamp: number;
  lastBlockId: number;
  nextBlockId: number;
}
