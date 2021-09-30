import { BigNumber } from 'ethers';

export type ChainStatus = {
  chainAddress?: string;
  blockNumber: BigNumber;
  timePadding: number;
  lastDataTimestamp: number;
  lastBlockId: number;
  nextLeader: string;
  nextBlockId: number;
  validators: string[];
  powers: BigNumber[];
  locations: string[];
  staked: BigNumber;
  minSignatures: number;
};
