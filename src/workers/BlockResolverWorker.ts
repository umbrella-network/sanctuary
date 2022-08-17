import Bull from 'bullmq';
import { Logger } from 'winston';
import { inject, injectable } from 'inversify';
import NewBlocksResolver from '../services/NewBlocksResolver';
import Settings from '../types/Settings';
import ChainSynchronizer from '../services/ChainSynchronizer';
import newrelic from 'newrelic';
import { ChainsIds } from '../types/ChainsIds';
import { SingletonWorker } from './SingletonWorker';

@injectable()
class BlockResolverWorker extends SingletonWorker {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(NewBlocksResolver) newBlocksResolver!: NewBlocksResolver;
  @inject(ChainSynchronizer) chainSynchronizer!: ChainSynchronizer;

  apply = async (job: Bull.Job): Promise<void> => {
    const interval = parseInt(job.data.interval);
    const lockTTL = parseInt(job.data.lockTTL);
    if (this.isStale(job, interval)) return;

    const chainId = job.data.chainId;
    await this.synchronizeWork(chainId, lockTTL, async () => this.execute(chainId));
  };

  private execute = async (chainId: ChainsIds): Promise<void> => {
    this.logger.info(`[${chainId}] Running BlockResolverWorker at ${new Date().toISOString()}`);

    try {
      // this is in sequence on purpose - if we can't synchronise chain we should not synchronise blocks
      await this.chainSynchronizer.apply(chainId);
      await this.newBlocksResolver.apply(chainId);
    } catch (e) {
      newrelic.noticeError(e);
      this.logger.error(e);
    }

    this.logger.info(`[${chainId}] BlockResolverWorker finished at ${new Date().toISOString()}`);
  };
}

export default BlockResolverWorker;
