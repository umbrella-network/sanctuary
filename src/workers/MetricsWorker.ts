import Bull from 'bullmq';
import { inject, injectable } from 'inversify';

import BasicWorker from './BasicWorker';
import { ContractSynchronizer } from '../services/ContractSynchronizer';
import { ChainsIds } from '../types/ChainsIds';
import { STAKING_BANK_NAME, UMBRELLA_FEEDS_NAME } from '../constants/variables';
import { OnChainTxFetcher } from '../services/on-chain-stats/OnChainTxFetcher';
import { KeysUpdateService } from '../services/on-chain-stats/KeysUpdateService';

@injectable()
class MetricsWorker extends BasicWorker {
  @inject(ContractSynchronizer) private contractSynchronizer!: ContractSynchronizer;
  @inject(OnChainTxFetcher) private onChainTxFetcher!: OnChainTxFetcher;
  @inject(KeysUpdateService) private keysUpdateService!: KeysUpdateService;

  apply = async (job: Bull.Job): Promise<void> => {
    this.logger.info(`[MetricsWorker] apply for ${job.id}`);

    try {
      await this.keysUpdateService.apply();
    } catch (e) {
      this.logger.error(`[MetricsWorker] keysUpdateService: ${e.message}`);
    }

    try {
      const chains = Object.keys(this.settings.blockchain.blockchainScanner) as ChainsIds[];
      await Promise.allSettled(chains.map((chainId) => this.syncOnChainTransactions(chainId)));
    } catch (e) {
      this.logger.error(`[MetricsWorker] syncOnChainTransactions: ${e.message}`);
    }
  };

  private syncOnChainTransactions = async (chainId: ChainsIds): Promise<void> => {
    const { lastSyncedBlock } = await this.contractSynchronizer.apply(chainId, [
      UMBRELLA_FEEDS_NAME,
      STAKING_BANK_NAME,
    ]);

    await this.onChainTxFetcher.call(chainId, lastSyncedBlock);
  };
}

export default MetricsWorker;
