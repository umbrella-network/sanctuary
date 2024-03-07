import Bull from 'bullmq';
import { inject, injectable } from 'inversify';

import BasicWorker from './BasicWorker';
import { ContractSynchronizer } from '../services/ContractSynchronizer';
import { ChainsIds } from '../types/ChainsIds';
import { STAKING_BANK_NAME, UMBRELLA_FEEDS_NAME } from '../constants/variables';
import { OnChainTxFetcher } from '../services/on-chain-stats/OnChainTxFetcher';
import { KeysUpdateService } from '../services/on-chain-stats/KeysUpdateService';
import { ValidatorsWalletsScanner } from '../services/ValidatorsWalletsScanner';

@injectable()
class MetricsWorker extends BasicWorker {
  @inject(ContractSynchronizer) private contractSynchronizer!: ContractSynchronizer;
  @inject(OnChainTxFetcher) private onChainTxFetcher!: OnChainTxFetcher;
  @inject(KeysUpdateService) private keysUpdateService!: KeysUpdateService;
  @inject(ValidatorsWalletsScanner) private validatorsWalletsScanner: ValidatorsWalletsScanner;

  private lastWalletRun: Record<string, number> = {};

  apply = async (job: Bull.Job): Promise<void> => {
    this.logger.debug(`[MetricsWorker] apply for ${job.id}`);
    const chains = Object.keys(this.settings.blockchain.blockchainScanner) as ChainsIds[];

    try {
      await this.keysUpdateService.apply();
    } catch (e) {
      this.logger.error(`[MetricsWorker] keysUpdateService: ${e.message}`);
    }

    const results = await Promise.allSettled(chains.map((chainId) => this.syncOnChainTransactions(chainId)));

    results.forEach((r) => {
      if (r.status == 'fulfilled') return;
      this.logger.error(`[MetricsWorker] error: ${r.reason}`);
    });
  };

  private syncOnChainTransactions = async (chainId: ChainsIds): Promise<void> => {
    const { lastSyncedBlock } = await this.contractSynchronizer.apply(chainId, [
      UMBRELLA_FEEDS_NAME,
      STAKING_BANK_NAME,
    ]);

    if (lastSyncedBlock <= 0) return;

    await Promise.all([
      this.onChainTxFetcher.call(chainId, lastSyncedBlock),
      this.allowWalletScanner(chainId) ? this.validatorsWalletsScanner.call(chainId) : undefined,
    ]);
  };

  private allowWalletScanner(chainId: ChainsIds): boolean {
    const now = Date.now();
    const lastRun = this.lastWalletRun[chainId];

    if (!lastRun || now - lastRun > 60 * 60 * 24 * 1000) {
      this.lastWalletRun[chainId] = now;
      return true;
    }

    return false;
  }
}

export default MetricsWorker;
