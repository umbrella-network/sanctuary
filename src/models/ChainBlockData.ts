import { BigNumber } from 'ethers';

export type ChainFCDsData = [values: BigNumber[], timestamps: number[]];

export interface ChainBlockData {
  root: string;
  dataTimestamp: number;
  affidavit: BigNumber;
}
