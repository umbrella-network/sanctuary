import { BigNumber } from 'ethers';

export type LogMint = {
  chain: string;
  minter: string;
  blockId: number;
  staked: BigNumber;
  power: BigNumber;
};

export type LogVoter = {
  blockId: number;
  voter: string;
  vote: BigNumber;
};

export type LogRegistered = {
  destination: string;
  bytes32: string;
  anchor: number;
};
