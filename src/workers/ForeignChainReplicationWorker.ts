import { inject, injectable } from 'inversify';
import Bull from 'bullmq';
import { ForeignChainReplicator } from '../services/ForeignChainReplicator';
import { SingletonWorker } from './SingletonWorker';
import ChainSynchronizer from '../services/ChainSynchronizer';
import { TForeignChainsIds } from '../types/ChainsIds';

@injectable()
export class ForeignChainReplicationWorker extends SingletonWorker {
  @inject(ForeignChainReplicator) replicator: ForeignChainReplicator;
  @inject(ChainSynchronizer) chainSynchronizer!: ChainSynchronizer;

  apply = async (job: Bull.Job): Promise<void> => {
    const { lockTTL, chainId, isStale } = this.parseJobData(job);
    if (isStale) return;

    await this.synchronizeWork(chainId, lockTTL, async () => this.execute(chainId as TForeignChainsIds));
  };

  private execute = async (foreignChainId: TForeignChainsIds): Promise<void> => {
    try {
      this.logger.info(`[${foreignChainId}] Starting Foreign Chain Block Synchronization`);
      // this is in sequence on purpose - if we can't synchronise chain we should not synchronise blocks
      await this.chainSynchronizer.apply(foreignChainId);
      await this.replicator.apply({ foreignChainId });
      this.logger.info(`[${foreignChainId}] Foreign Chain Block Replication Complete`);
    } catch (e) {
      e.message = `[${foreignChainId}] ${e.message}`;
      this.logger.error(e);
      throw e;
    }
  };
}
