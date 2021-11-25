import Bull from 'bullmq';
import { Logger } from 'winston';
import newrelic from 'newrelic';
import { inject, injectable } from 'inversify';
import BlockSynchronizer from '../services/BlockSynchronizer';
import Settings from '../types/Settings';
import ChainSynchronizer from '../services/ChainSynchronizer';
import { SingletonWorker } from './SingletonWorker';

@injectable()
class BlockSynchronizerWorker extends SingletonWorker {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(BlockSynchronizer) blockSynchronizer!: BlockSynchronizer;
  @inject(ChainSynchronizer) chainSynchronizer!: ChainSynchronizer;

  apply = async (job: Bull.Job): Promise<void> => {
    const interval = this.settings.jobs.blockCreation.interval;
    const lockTTL = this.settings.jobs.blockCreation.lockTTL;
    if (this.isStale(job, interval)) return;

    await this.synchronizeWork('block-synchronizer', lockTTL, this.execute);
  };

  private execute = async (): Promise<void> => {
    this.logger.info(`Running BlockSynchronizerWorker at ${new Date().toISOString()}`);

    try {
      await this.blockSynchronizer.apply();
    } catch (e) {
      newrelic.noticeError(e);
      this.logger.error(e);
    }

    this.logger.info(`BlockSynchronizerWorker finished at ${new Date().toISOString()}`);
  };
}

export default BlockSynchronizerWorker;
