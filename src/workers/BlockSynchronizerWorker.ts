import Bull from 'bullmq';
import { Logger } from 'winston';
import newrelic from 'newrelic';
import { inject, injectable } from 'inversify';
import BlockSynchronizer from '../services/BlockSynchronizer';
import Settings from '../types/Settings';
import ChainSynchronizer from '../services/ChainSynchronizer';
import { SingletonWorker } from './SingletonWorker';
import { ChainsIds } from '../types/ChainsIds';

@injectable()
class BlockSynchronizerWorker extends SingletonWorker {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(BlockSynchronizer) blockSynchronizer!: BlockSynchronizer;
  @inject(ChainSynchronizer) chainSynchronizer!: ChainSynchronizer;

  apply = async (job: Bull.Job): Promise<void> => {
    const { lockTTL, isStale, chainId } = this.parseJobData(job);
    if (isStale) return;

    await this.synchronizeWork('block-synchronizer', lockTTL, () => this.execute(chainId));
  };

  private execute = async (chainId: ChainsIds): Promise<void> => {
    this.logger.info(`[${chainId}] Running BlockSynchronizerWorker at ${new Date().toISOString()}`);

    try {
      await this.blockSynchronizer.apply(chainId);
    } catch (e) {
      newrelic.noticeError(e);
      this.logger.error(e);
    }

    this.logger.info(`[${chainId}]BlockSynchronizerWorker finished at ${new Date().toISOString()}`);
  };
}

export default BlockSynchronizerWorker;
