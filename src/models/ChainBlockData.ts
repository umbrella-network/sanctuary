import { BigNumber } from 'ethers';
import { IChainInstance } from './ChainInstance';

export interface ChainBlockData {
  anchor: BigNumber;
  timestamp: BigNumber;
  root: string;
  minter: string;
  staked: BigNumber;
  power: BigNumber;
}

export interface ChainBlockDataExtended extends ChainBlockData {
  chainInstance: IChainInstance;
  height: number;
}
