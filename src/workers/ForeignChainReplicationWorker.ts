import { inject, injectable } from 'inversify';
import Bull from 'bullmq';
import { ForeignChainReplicator } from '../services/ForeignChainReplicator';
import { SingletonWorker } from './SingletonWorker';

@injectable()
export class ForeignChainReplicationWorker extends SingletonWorker {
  @inject(ForeignChainReplicator) replicator: ForeignChainReplicator;

  apply = async (job: Bull.Job): Promise<void> => {
    const interval = parseInt(job.data.interval);
    const lockTTL = parseInt(job.data.lockTTL);
    const foreignChainId = job.data.foreignChainId as string;
    if (this.isStale(job, interval)) return;

    this.synchronizeWork(
      foreignChainId,
      lockTTL,
      async () => await this.execute(foreignChainId)
    );
  }

  private execute = async (foreignChainId: string): Promise<void> => {
    try {
      this.logger.info('Starting Foreign Chain Block Synchronization...');
      await this.replicator.apply({ foreignChainId });
      this.logger.info('Foreign Chain Block Replication Complete');
    } catch (e) {
      this.logger.error(e);
      throw(e);
    }
  }
}
