import { inject, injectable } from 'inversify';
import { Contract } from 'ethers';

import Settings from '../types/Settings';
import Blockchain from '../lib/Blockchain';
import {BaseChainContract} from './BaseChainContract';

// TODO this abi should came from SDK
import abi from './ForeignChainAbi.json';
import {TransactionResponse} from '@ethersproject/providers';
import {TransactionRequest} from '@ethersproject/abstract-provider/src.ts/index';

@injectable()
export class ForeignChainContract extends BaseChainContract {
  async submit(
    dataTimestamp: number,
    root: string,
    keys: Buffer[],
    values: Buffer[],
    blockId: number,
    transactionRequest: TransactionRequest
  ): Promise<TransactionResponse> {
    return (await this.resolveContract())
      .contract
      .connect(this.blockchain.wallets[this.chainId])
      .submit(dataTimestamp, root, keys, values, blockId, transactionRequest);
  }

  protected setContract = (chainAddress: string): ForeignChainContract => {
    this.contract = new Contract(chainAddress, abi, this.blockchain.getProvider(this.chainId));
    return this;
  };
}
