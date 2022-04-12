import { BigNumber } from 'ethers';

export interface IProvider {
  getBlockNumber(): Promise<number>;
  getBalance(address: string): Promise<BigNumber>;
  getTransactionCount(address: string): Promise<number>;
}
