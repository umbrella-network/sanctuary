import { inject, injectable } from 'inversify';
import { Logger } from 'winston';
import { TransactionResponse } from '@ethersproject/providers';

import { ChainsIds } from '../../types/ChainsIds';
import { BlockchainScannerRepository } from '../../repositories/BlockchainScannerRepository';
import { promiseWithTimeout } from '../../utils/promiseWithTimeout';

@injectable()
export class EvmTxsFetcher {
  @inject('Logger') private logger!: Logger;

  @inject(BlockchainScannerRepository) private blockchainScannerRepository: BlockchainScannerRepository;

  async call(
    chainId: ChainsIds,
    fromBlock: number,
    toBlock: number,
    existingBlocks: number[]
  ): Promise<{ txs: TransactionResponse[]; lastBlockBeforeError: number | undefined }> {
    const blockchainScanner = this.blockchainScannerRepository.get(chainId);
    const provider = blockchainScanner.provider;

    const arr: number[] = [];
    const setOfBlocks: Set<number> = new Set<number>(existingBlocks);

    for (let i = fromBlock; i <= toBlock; i++) {
      if (setOfBlocks.has(i)) continue;

      arr.push(i);
    }

    this.logger.debug(`${chainId}[EvmTxsFetcher] fetching txs for ${arr.length} blocks`);

    const allTxsSettled = await Promise.allSettled(
      arr.sort().map((i) => promiseWithTimeout(provider.getBlockWithTransactions(i), 15000))
    );

    let errorDetected = false;
    let lastBlockBeforeError = arr[0] - 1;

    const allTxs = allTxsSettled.map((result, i) => {
      if (result.status == 'fulfilled') {
        if (!errorDetected) lastBlockBeforeError = result.value.number;

        return result.value;
      }

      errorDetected = true;
      this.logger.error(`${chainId} block ${arr[i]} error: ${result.reason.toString()}`);
      return undefined;
    });

    return {
      lastBlockBeforeError: errorDetected ? lastBlockBeforeError : undefined,
      txs: allTxs
        .filter((txs) => !!txs)
        .map((txs) => {
          return txs.transactions.map((tx) => {
            return { ...tx, timestamp: txs.timestamp };
          });
        })
        .flat(),
    };
  }
}
