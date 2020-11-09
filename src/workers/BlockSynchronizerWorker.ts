import Bull from 'bullmq';
import { Logger } from 'winston';
import { inject, injectable } from 'inversify';
import BlockSynchronizer from '../services/BlockSynchronizer';
import BasicWorker from './BasicWorker';
import Settings from '../types/Settings';

@injectable()
class BlockSynchronizerWorker extends BasicWorker {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(BlockSynchronizer) blockSynchronizer!: BlockSynchronizer;

  apply = async (job: Bull.Job): Promise<void> => {
    if (this.isStale(job)) return;

    try {
      this.logger.info(`Running BlockSynchronizerWorker at  ${new Date().toISOString()}`);
      await this.blockSynchronizer.apply();
    } catch (e) {
      this.logger.error(e);
    }
  }

  isStale = (job: Bull.Job): boolean => {
    const age = new Date().getTime() - job.timestamp;
    return age > this.settings.jobs.blockCreation.interval;
  }
}

export default BlockSynchronizerWorker;
