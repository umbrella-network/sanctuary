import { inject, injectable } from 'inversify';
import { Logger } from 'winston';
import { TransactionResponse } from '@ethersproject/providers';

import { MappingRepository } from '../../repositories/MappingRepository';
import { ChainsIds } from '../../types/ChainsIds.js';
import Settings from '../../types/Settings';
import { BlockchainScannerRepository } from '../../repositories/BlockchainScannerRepository';
import { RegisteredContractRepository } from '../../repositories/RegisteredContractRepository';
import { promiseWithTimeout } from '../../utils/promiseWithTimeout';

@injectable()
export class EvmTxsFetcher {
  @inject('Settings') private settings!: Settings;
  @inject('Logger') private logger!: Logger;

  @inject(BlockchainScannerRepository) private blockchainScannerRepository: BlockchainScannerRepository;
  @inject(MappingRepository) private mappingRepository: MappingRepository;
  @inject(RegisteredContractRepository) private contractRepository: RegisteredContractRepository;

  async call(
    chainId: ChainsIds,
    fromBlock: number,
    toBlock: number,
    existingBlocks: number[]
  ): Promise<{ txs: TransactionResponse[]; lastBlockBeforeError: number | undefined }> {
    const blockchainScanner = this.blockchainScannerRepository.get(chainId);
    const provider = blockchainScanner.provider;

    const arr: number[] = [];

    for (let i = fromBlock; i <= toBlock; i++) {
      if (existingBlocks.includes(i)) continue;

      arr.push(i);
    }

    this.logger.debug(`[EvmTxsFetcher] fetching txs for ${arr.length} blocks`);

    const allTxsSettled = await Promise.allSettled(
      arr.map((i) => {
        return promiseWithTimeout(provider.getBlockWithTransactions(i), 15000);
      })
    );

    let errorDetected = false;
    let lastBlockBeforeError: number | undefined;

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
