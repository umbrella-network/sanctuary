import Bull from 'bullmq';
import { Logger } from 'winston';
import { inject, injectable } from 'inversify';

import BasicWorker from './BasicWorker';
import { ContractSynchronizer } from '../services/ContractSynchronizer';
import { ChainsIds } from '../types/ChainsIds';
import { STAKING_BANK_NAME, UMBRELLA_FEEDS_NAME } from '../constants/variables';

@injectable()
class MetricsWorker extends BasicWorker {
  @inject('Logger') logger!: Logger;
  @inject(ContractSynchronizer) private contractSynchronizer!: ContractSynchronizer;

  apply = async (job: Bull.Job): Promise<void> => {
    this.logger.info(`[MetricsWorker] apply for ${job.id}`);
    const chains = Object.values(ChainsIds);

    try {
      await Promise.all(
        chains.map((chainId) => this.contractSynchronizer.apply(chainId, [UMBRELLA_FEEDS_NAME, STAKING_BANK_NAME]))
      );
    } catch (e) {
      this.logger.error(e);
    }
  };
}

export default MetricsWorker;
