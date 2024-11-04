import { inject, injectable } from 'inversify';
import { Logger } from 'winston';
import { TransactionResponse } from '@ethersproject/providers';

import { MappingRepository } from '../../repositories/MappingRepository';
import { ChainsIds } from '../../types/ChainsIds.js';
import Settings from '../../types/Settings';
import { BlockchainScannerRepository } from '../../repositories/BlockchainScannerRepository';
import { RegisteredContractRepository } from '../../repositories/RegisteredContractRepository';
import { UMBRELLA_FEEDS_NAME } from '../../constants/variables';
import { EvmTxsFetcher } from './EvmTxsFetcher';
import { UpdateTxRepository } from '../../repositories/UpdateTxRepository';
import { TxReceiptFetcher } from './TxReceiptFetcher';
import { CreateBatchRanges } from '../CreateBatchRanges';
import { ScanningTimeLeft } from './ScanningTimeLeft';

@injectable()
export class OnChainTxFetcher {
  @inject('Settings') private settings!: Settings;
  @inject('Logger') private logger!: Logger;

  @inject(BlockchainScannerRepository) private blockchainScannerRepository: BlockchainScannerRepository;
  @inject(MappingRepository) private mappingRepository: MappingRepository;
  @inject(RegisteredContractRepository) private contractRepository: RegisteredContractRepository;
  @inject(EvmTxsFetcher) private txsFetcher: EvmTxsFetcher;
  @inject(UpdateTxRepository) private updateTxRepository: UpdateTxRepository;
  @inject(TxReceiptFetcher) private txReceiptFetcher: TxReceiptFetcher;
  @inject(ScanningTimeLeft) private timeLeft: ScanningTimeLeft;

  async call(chainId: ChainsIds, lastSyncedBlock: number): Promise<void> {
    const blockchainScanner = this.blockchainScannerRepository.get(chainId);

    if (!blockchainScanner.settings.startBlockNumber) {
      this.logger.debug(`[OnChainTxFetcher][${chainId}] startBlockNumber not set`);
      return;
    }

    this.logger.info(`[OnChainTxFetcher][${chainId}] started with last synced block ${lastSyncedBlock}`);

    const [lastSavedBlock, network] = await Promise.all([
      this.getLastValidCheckedBlock(chainId),
      blockchainScanner.provider.getNetwork(),
    ]);

    const rangeFrom = this.blockFrom(chainId, lastSavedBlock);
    const rangeTo = this.blockTo(chainId, lastSyncedBlock);

    if (rangeFrom >= rangeTo) {
      this.logger.debug(`[OnChainTxFetcher][${chainId}] rangeFrom ${rangeFrom} >= rangeTo ${rangeTo}`);
      return;
    }

    const ranges = CreateBatchRanges.apply(rangeFrom, rangeTo, blockchainScanner.settings.fetchBlocksBatchSize);
    const timeStart = Date.now();

    const allFeedsContracts = await this.umbrellaFeedsMap(chainId);

    this.logger.debug(`[OnChainTxFetcher][${chainId}] allFeedsContracts.size: ${allFeedsContracts.size}`);

    this.logger.info(
      `[OnChainTxFetcher][${chainId}] blocks to sync: ${rangeTo - rangeFrom} blocks, starting from ${rangeFrom}`
    );

    let gotError = false;

    // sync execution
    for (let i = 0; i < ranges.length && this.timeLeft.call(timeStart) > 0 && !gotError; i++) {
      const [from, to] = ranges[i];
      const logPrefix = `[OnChainTxFetcher][${chainId}] [${i}/${ranges.length}]`;

      this.logger.debug(
        `${logPrefix} scanning ${from} - ${to} (${to - from} blocks), T${this.timeLeft.call(timeStart)}s`
      );

      const fetchedBlocks = await this.updateTxRepository.getBlocks(chainId, from, to);
      const { txs, lastBlockBeforeError } = await this.txsFetcher.call(chainId, from, to, fetchedBlocks);
      const filteredTx = this.onlyUmbrellaFeedsTx(txs, allFeedsContracts);
      this.logger.debug(`[OnChainTxFetcher][${chainId}] filteredTx: ${filteredTx.length} of ${txs.length}`);

      gotError = lastBlockBeforeError !== undefined;
      const checkpointBlock = lastBlockBeforeError || to;

      if (gotError) {
        this.logger.warn(`${logPrefix} error detected, breaking the loop at ${checkpointBlock}`);
      }

      if (filteredTx.length == 0) {
        this.logger.debug(`${logPrefix} no 'update()' tx found`);
        await this.saveCheckpoint(chainId, checkpointBlock);
        continue;
      }

      this.logger.info(
        `${logPrefix} found ${filteredTx.length} 'update()' txs ${filteredTx.map((tx) => tx.blockNumber).sort()}`
      );

      const receipts = await this.txReceiptFetcher.call(
        chainId,
        filteredTx.map((tx) => tx.hash)
      );

      if (filteredTx.length != Object.keys(receipts).length) {
        throw new Error(`${logPrefix} expected ${filteredTx.length} receipts, got ${Object.keys(receipts).length}`);
      }

      const allSaved = await Promise.all(
        filteredTx.map((tx) => this.updateTxRepository.saveUpdates(chainId, network.chainId, tx, receipts[tx.hash]))
      );

      if (!allSaved.every((success) => success)) {
        throw new Error(`${logPrefix} there were errors while saving data to DB`);
      }

      await this.saveCheckpoint(chainId, checkpointBlock);
    }
  }

  private onlyUmbrellaFeedsTx(txs: TransactionResponse[], feedsAddresses: Set<string>): TransactionResponse[] {
    return txs.filter((tx) => {
      return !!tx.to && feedsAddresses.has(tx.to.toLowerCase());
    });
  }

  private async umbrellaFeedsMap(chainId: ChainsIds): Promise<Set<string>> {
    const set = new Set<string>();
    const umbrellaFeeds = await this.contractRepository.getAllContracts(chainId, UMBRELLA_FEEDS_NAME);

    umbrellaFeeds.forEach((uf) => {
      set.add(uf.address.toLowerCase());
    });

    return set;
  }

  private blockFrom(chainId: ChainsIds, lastSavedBlock: number | undefined): number {
    const blockchainScanner = this.blockchainScannerRepository.get(chainId);
    return lastSavedBlock ? lastSavedBlock + 1 : blockchainScanner.settings.startBlockNumber;
  }

  private lastCheckedBlockMappingKey(chainId: string): string {
    return `OnChainTxFetcher_lastCheckedBlock_${chainId}`;
  }

  private async getLastValidCheckedBlock(chainId: ChainsIds): Promise<number | undefined> {
    const lastCheckedBlock = await this.mappingRepository.get(this.lastCheckedBlockMappingKey(chainId));
    return lastCheckedBlock ? parseInt(lastCheckedBlock, 10) : undefined;
  }

  private blockTo(chainId: ChainsIds, currentBlock: number): number {
    const blockchainScanner = this.blockchainScannerRepository.get(chainId);
    return currentBlock - blockchainScanner.settings.confirmations;
  }

  private async saveCheckpoint(chainId: ChainsIds, blockNumber: number): Promise<void> {
    this.logger.debug(`[OnChainTxFetcher][${chainId}] checkpoint ${blockNumber}`);
    await this.mappingRepository.set(this.lastCheckedBlockMappingKey(chainId), blockNumber.toString(10));
  }
}
