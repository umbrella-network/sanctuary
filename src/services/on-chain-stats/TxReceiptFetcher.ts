import { TransactionReceipt } from '@ethersproject/providers';
import { inject, injectable } from 'inversify';

import { ChainsIds } from '../../types/ChainsIds';
import { BlockchainScannerRepository } from '../../repositories/BlockchainScannerRepository';
import { BaseTxReceiptFetcher } from './BaseTxReceiptFetcher';

@injectable()
export class TxReceiptFetcher {
  @inject(BlockchainScannerRepository) private blockchainScannerRepository: BlockchainScannerRepository;
  @inject(BaseTxReceiptFetcher) private baseTxReceiptFetcher: BaseTxReceiptFetcher;

  async call(chainId: ChainsIds, txHashes: string[]): Promise<Record<string, TransactionReceipt>> {
    const blockchainScanner = this.blockchainScannerRepository.get(chainId);
    const result: Record<string, TransactionReceipt> = {};
    let receipts: TransactionReceipt[] = [];

    switch (chainId) {
      case 'base':
        receipts = await Promise.all(txHashes.map((h) => this.baseTxReceiptFetcher.call(h)));
        break;

      default:
        receipts = await Promise.all(txHashes.map((h) => blockchainScanner.provider.getTransactionReceipt(h)));
    }

    receipts.forEach((receipt) => (result[receipt.transactionHash] = receipt));

    return result;
  }
}
