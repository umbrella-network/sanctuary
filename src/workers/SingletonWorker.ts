import { inject } from 'inversify';
import Bull from 'bullmq';
import LockRepository from '../repositories/LockRepository';
import BasicWorker from './BasicWorker';

export abstract class SingletonWorker extends BasicWorker {
  @inject(LockRepository) lockRepository!: LockRepository;

  synchronizeWork = async (lockId: string, ttl: number, work: Function): Promise<void> => {
    let lockAcquired: boolean;

    try {
      lockAcquired = await this.lock(lockId, ttl);
      if (lockAcquired) work();
    } finally {
      if (lockAcquired) await this.unlock(lockId);
    }
  }

  private lock = async (lockId: string, ttl: number): Promise<boolean> => this.lockRepository.acquire(lockId, ttl);
  private unlock = async (lockId: string): Promise<boolean> => this.lockRepository.release(lockId);
}
