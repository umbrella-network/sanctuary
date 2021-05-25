import { BigNumber } from 'ethers';
import { IChainInstance } from './ChainInstance';

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

export interface ChainBlockDataExtended extends ChainBlockData {
  chainInstance: IChainInstance;
  blockId: number;
}
