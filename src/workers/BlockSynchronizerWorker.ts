import Bull from 'bullmq';
import { Logger } from 'winston';
import newrelic from 'newrelic';
import { inject, injectable } from 'inversify';
import newrelic from 'newrelic';
import BlockSynchronizer from '../services/BlockSynchronizer';
import BasicWorker from './BasicWorker';
import Settings from '../types/Settings';
import ChainSynchronizer from '../services/ChainSynchronizer';

@injectable()
class BlockSynchronizerWorker extends BasicWorker {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(BlockSynchronizer) blockSynchronizer!: BlockSynchronizer;
  @inject(ChainSynchronizer) chainSynchronizer!: ChainSynchronizer;

  apply = async (job: Bull.Job): Promise<void> => {
    if (this.isStale(job)) return;

    this.logger.info(`Running BlockSynchronizerWorker at ${new Date().toISOString()}`);

    try {
      await this.blockSynchronizer.apply();
    } catch (e) {
      newrelic.noticeError(e);
      this.logger.error(e);
    }

    this.logger.info(`BlockSynchronizerWorker finished at ${new Date().toISOString()}`);
  };

  isStale = (job: Bull.Job): boolean => {
    const age = new Date().getTime() - job.timestamp;
    return age > this.settings.jobs.blockCreation.interval;
  };
}

export default BlockSynchronizerWorker;
