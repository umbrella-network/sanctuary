import { inject } from 'inversify';
import Bull from 'bullmq';
import LockRepository from '../repositories/LockRepository';
import BasicWorker from './BasicWorker';
import { Logger } from 'winston';
import { ChainsIds } from '../types/ChainsIds';

export abstract class SingletonWorker extends BasicWorker {
  @inject('Logger') logger!: Logger;
  @inject(LockRepository) lockRepository!: LockRepository;

  parseJobData = (job: Bull.Job): { lockTTL: number; chainId: ChainsIds; isStale: boolean } => {
    const interval = parseInt(job.data.interval);
    const lockTTL = parseInt(job.data.lockTTL);
    const chainId = job.data.chainId;

    return { lockTTL, chainId, isStale: this.isStale(job, interval) };
  };

  synchronizeWork = async (lockId: string, ttl: number, work: () => void): Promise<void> => {
    let lockAcquired: boolean;

    try {
      lockAcquired = await this.lock(lockId, ttl);
      if (lockAcquired) await work();
    } finally {
      if (lockAcquired) await this.unlock(lockId);
    }
  };

  isStale = (job: Bull.Job, ageLimit: number): boolean => {
    const age = new Date().getTime() - job.timestamp;
    const chainId = job.data.chainId;

    const isStale = age > ageLimit;
    if (!isStale) return false;

    this.logger.info(`[${chainId}] Job ${job.id} is stale - discarding...`);
    return true;
  };

  private lock = async (lockId: string, ttl: number): Promise<boolean> => this.lockRepository.acquire(lockId, ttl);
  private unlock = async (lockId: string): Promise<boolean> => this.lockRepository.release(lockId);
}
