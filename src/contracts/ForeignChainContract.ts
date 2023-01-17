import { Contract } from 'ethers';

import { BaseChainContract } from './BaseChainContract';

// TODO this abi should came from SDK
import { TransactionResponse } from '@ethersproject/providers';
import { TransactionRequest } from '@ethersproject/abstract-provider/src.ts/index';

export class ForeignChainContract extends BaseChainContract {
  submit = async (
    dataTimestamp: number,
    root: string,
    keys: Buffer[],
    values: Buffer[],
    blockId: number,
    transactionRequest: TransactionRequest
  ): Promise<TransactionResponse> => {
    return (await this.resolveContract()).contract
      .connect(this.blockchain.wallet)
      .submit(dataTimestamp, root, keys, values, blockId, transactionRequest);
  };

  protected setContract = (chainAddress: string): ForeignChainContract => {
    this.contract = new Contract(chainAddress, this.chainAbi(), this.blockchain.getProvider());
    return this;
  };
}
