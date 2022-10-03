import { inject, injectable } from 'inversify';
import Bull from 'bullmq';
import { ForeignChainReplicator } from '../services/ForeignChainReplicator';
import ChainSynchronizer from '../services/ChainSynchronizer';
import { TForeignChainsIds } from '../types/ChainsIds';
import BasicWorker from './BasicWorker';

@injectable()
export class ForeignChainReplicationWorker extends BasicWorker {
  @inject(ForeignChainReplicator) replicator: ForeignChainReplicator;
  @inject(ChainSynchronizer) chainSynchronizer!: ChainSynchronizer;

  apply = async (job: Bull.Job): Promise<void> => {
    const chainId = job.data.chainId;
    await this.execute(chainId);
  };

  private execute = async (foreignChainId: TForeignChainsIds): Promise<void> => {
    try {
      this.logger.info(`[${foreignChainId}] Starting Foreign Chain Block Synchronization`);
      // this is in sequence on purpose - if we can't synchronise chain we should not synchronise blocks
      await this.chainSynchronizer.apply(foreignChainId);
      await this.replicator.apply({ foreignChainId });
      this.logger.info(`[${foreignChainId}] Foreign Chain Block Replication Complete`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      e.message = `[${foreignChainId}] ${e.message}`;
      this.logger.error(e);
      throw e;
    }
  };
}
