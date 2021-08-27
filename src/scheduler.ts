import './boot';
import Application from './lib/Application';
import BlockSynchronizerWorker from './workers/BlockSynchronizerWorker';
import BlockResolverWorker from './workers/BlockResolverWorker';
import MetricsWorker from './workers/MetricsWorker';
import { ForeignChainReplicationWorker } from './workers';
import Settings from './types/Settings';
import { Logger } from 'winston';
import newrelic from 'newrelic';

(async (): Promise<void> => {
  const settings: Settings = Application.get('Settings');
  const logger: Logger = Application.get('Logger');
  const blockSynchronizerWorker = Application.get(BlockSynchronizerWorker);
  const blockResolverWorker = Application.get(BlockResolverWorker);
  const metricsWorker = Application.get(MetricsWorker);
  const foreignChainReplicationWorker = Application.get(ForeignChainReplicationWorker);

  // schedule Ethereum replicator
  foreignChainReplicationWorker.enqueue(
    {
      foreignChainId: 'ethereum',
      lockTTL: settings.jobs.foreignChainReplication.ethereum.lockTTL,
      interval: settings.jobs.foreignChainReplication.ethereum.interval
    },
    {
      repeat: {
        every: settings.jobs.foreignChainReplication.ethereum.interval,
        limit: 1
      }
    }
  );

  setInterval(async () => {
    await metricsWorker.enqueue(
      {},
      {
        removeOnComplete: true,
        removeOnFail: true,
      }
    );
  }, settings.jobs.metricsReporting.interval);

  setInterval(async () => {
    try {
      await blockSynchronizerWorker.enqueue(
        {},
        {
          removeOnComplete: true,
          removeOnFail: true,
        }
      );
    } catch (e) {
      newrelic.noticeError(e);
      logger.error(e);
    }
  }, settings.jobs.blockCreation.interval);

  setInterval(async () => {
    try {
      await blockResolverWorker.enqueue(
        {},
        {
          removeOnComplete: true,
          removeOnFail: true,
        }
      );
    } catch (e) {
      newrelic.noticeError(e);
      logger.error(e);
    }
  }, settings.jobs.blockCreation.interval);
})();
