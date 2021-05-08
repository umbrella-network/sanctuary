import { BigNumber } from 'ethers';
import { IChainInstance } from './ChainInstance';

export interface ChainFCDData {
  dataTimestamp: BigNumber;
  value: string;
}

export type ChainFCDsData = [timestamps: BigNumber[], values: BigNumber[]];

export interface ChainBlockData {
  anchor: BigNumber;
  dataTimestamp: BigNumber;
  timestamp: number;
  root: string;
  minter: string;
  staked: BigNumber;
  power: BigNumber;
}

export interface ChainBlockDataExtended extends ChainBlockData {
  chainInstance: IChainInstance;
  height: number;
}
