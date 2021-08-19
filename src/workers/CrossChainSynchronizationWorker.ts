import { inject, injectable } from 'inversify';
import { Logger } from 'winston';
import Bull from 'bullmq';
import BasicWorker from './BasicWorker';
import LockRepository from '../repositories/LockRepository';
import Settings from '../types/Settings';

@injectable()
class CrossChainSynchronizationWorker extends BasicWorker {
  private readonly LOCK_ID = 'cross-chain-synchronization';

  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings['jobs']['crossChainSynchronization'];
  @inject(LockRepository) lockRepository!: LockRepository;

  apply = async (_job: Bull.Job): Promise<void> => {
    this.logger.info('Starting X-Chain Block Synchronization...');

    try {
      if (await this.lock()) {
        // FIND BLOCKS PENDING SYNCHRONIZATION
        // ITERATE & SYNCHRONIZE BLOCKS
      }

      this.logger.info('X-Chain Block Synchronization Complete');
    } catch (e) {
      this.logger.error(e);
    } finally {
      await this.unlock();
    }
  }

  private lock = async () => this.lockRepository.acquire(this.LOCK_ID, this.settings.lockTTL);
  private unlock = async () => this.lockRepository.release(this.LOCK_ID);
}

export default CrossChainSynchronizationWorker;
