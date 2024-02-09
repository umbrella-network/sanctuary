import * as optimismSDK from '@eth-optimism/sdk';
import { inject, injectable } from 'inversify';
import { TransactionReceipt } from '@ethersproject/abstract-provider';
import { BlockchainScannerRepository } from '../../repositories/BlockchainScannerRepository';
import { ChainsIds } from '../../types/ChainsIds';

@injectable()
export class BaseTxReceiptFetcher {
  @inject(BlockchainScannerRepository) private blockchainScannerRepository: BlockchainScannerRepository;

  async call(txHash: string): Promise<TransactionReceipt> {
    const l2RpcProvider = optimismSDK.asL2Provider(this.blockchainScannerRepository.get(ChainsIds.BASE).provider);
    return l2RpcProvider.getTransactionReceipt(txHash);
  }
}
