import { inject, injectable } from 'inversify';
import { Logger } from 'winston';
import Bull from 'bullmq';
import Settings from '../types/Settings';
import ForeignChainSynchronizer from '../services/ForeignChainSynchronizer';
import { SingletonWorker } from './SingletonWorker';

@injectable()
export class ForeignChainSynchronizationWorker extends SingletonWorker {
  private readonly LOCK_ID = 'foreign-chain-synchronization';

  @inject('Logger') logger!: Logger;
  @inject('Settings') lockTTL!: Settings['jobs']['foreignChainSynchronization']['lockTTL'];
  @inject('Settings') interval!: Settings['jobs']['foreignChainSynchronization']['interval'];
  @inject(ForeignChainSynchronizer) synchronizer: ForeignChainSynchronizer;

  apply = async (job: Bull.Job): Promise<void> => {
    if (this.isStale(job, this.interval)) return;

    this.synchronizeWork(this.LOCK_ID, this.lockTTL, () => {
      try {
        this.synchronize();
      } catch (e) {
        this.logger.error(e);
      }
    })
  }

  isStale = (job: Bull.Job, ageLimit: number): boolean => {
    const age = new Date().getTime() - job.timestamp;
    const isStale = age > ageLimit;
    if (!isStale) return false;

    this.logger.info(`Job ${job.id} is stale - discarding...`)
    return true;
  };

  synchronize = async (): Promise<void> => {
    this.logger.info('Starting Foreign Chain Block Synchronization...');
    this.synchronizer.apply();
    this.logger.info('Foreign Chain Block Synchronization Complete');
  }
}
