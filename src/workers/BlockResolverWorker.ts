import Bull from 'bullmq';
import { Logger } from 'winston';
import { inject, injectable } from 'inversify';
import NewBlocksResolver from '../services/NewBlocksResolver';
import BasicWorker from './BasicWorker';
import Settings from '../types/Settings';
import ChainSynchronizer from '../services/ChainSynchronizer';
import newrelic from 'newrelic';

@injectable()
class BlockResolverWorker extends BasicWorker {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(NewBlocksResolver) newBlocksResolver!: NewBlocksResolver;
  @inject(ChainSynchronizer) chainSynchronizer!: ChainSynchronizer;

  apply = async (job: Bull.Job): Promise<void> => {
    if (this.isStale(job)) return;

    this.logger.info(`Running BlockResolverWorker at ${new Date().toISOString()}`);

    try {
      // this is in sequence on purpose - if we can't synchronise chain we should not synchronise blocks
      await this.chainSynchronizer.apply(this.settings.blockchain.homeChainId);
      await this.newBlocksResolver.apply();
    } catch (e) {
      newrelic.noticeError(e);
      this.logger.error(e);
    }

    this.logger.info(`BlockResolverWorker finished at ${new Date().toISOString()}`);
  };

  isStale = (job: Bull.Job): boolean => {
    const age = new Date().getTime() - job.timestamp;
    return age > this.settings.jobs.blockCreation.interval;
  };
}

export default BlockResolverWorker;
