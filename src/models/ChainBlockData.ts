import { BigNumber } from 'ethers';

export interface ChainFCDData {
  dataTimestamp: number;
  value: string;
}

export type ChainFCDsData = [values: BigNumber[], timestamps: number[]];

export interface ChainBlockData {
  root: string;
  dataTimestamp: number;
  affidavit: BigNumber;
}
