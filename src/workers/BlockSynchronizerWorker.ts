import Bull from 'bullmq';
import { Logger } from 'winston';
import { inject, injectable } from 'inversify';
import BlockSynchronizer from '../services/BlockSynchronizer';
import Settings from '../types/Settings';
import { SingletonWorker } from './SingletonWorker';

@injectable()
class BlockSynchronizerWorker extends SingletonWorker {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(BlockSynchronizer) blockSynchronizer!: BlockSynchronizer;

  apply = async (job: Bull.Job): Promise<void> => {
    const { lockTTL, isStale } = this.parseJobData(job);
    if (isStale) return;

    await this.synchronizeWork('block-synchronizer', lockTTL, this.execute);
  };

  private execute = async (): Promise<void> => {
    this.logger.info(`Running BlockSynchronizerWorker at ${new Date().toISOString()}`);

    try {
      await this.blockSynchronizer.apply();
    } catch (e) {
      this.logger.error(e);
    }

    this.logger.info(`BlockSynchronizerWorker finished at ${new Date().toISOString()}`);
  };
}

export default BlockSynchronizerWorker;
