import Bull from 'bullmq';
import { inject, injectable } from 'inversify';
import NewBlocksResolver from '../services/NewBlocksResolver';
import ChainSynchronizer from '../services/ChainSynchronizer';
import newrelic from 'newrelic';
import { ChainsIds } from '../types/ChainsIds';
import { sleep } from '../utils/sleep';
import { DispatcherDetector } from '../services/DispatcherDetector';
import BasicWorker from './BasicWorker';

@injectable()
class BlockResolverWorker extends BasicWorker {
  @inject(NewBlocksResolver) newBlocksResolver!: NewBlocksResolver;
  @inject(ChainSynchronizer) chainSynchronizer!: ChainSynchronizer;
  @inject(DispatcherDetector) dispatcherDetector: DispatcherDetector;

  apply = async (job: Bull.Job): Promise<void> => {
    const chainId = job.data.chainId;

    if (!(await this.dispatcherDetector.apply(chainId))) {
      this.logger.info(`[${chainId}] OLD chain architecture detected`);
      await sleep(60_000); // slow down execution
      return;
    }

    await this.execute(chainId);
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
