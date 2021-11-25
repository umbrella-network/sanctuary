import './boot';
import Application from './lib/Application';
import BlockSynchronizerWorker from './workers/BlockSynchronizerWorker';
import BlockResolverWorker from './workers/BlockResolverWorker';
import MetricsWorker from './workers/MetricsWorker';
import { ForeignChainReplicationWorker } from './workers';
import Settings, { ForeignChainReplicationSettings } from './types/Settings';
import { Logger } from 'winston';
import newrelic from 'newrelic';
import logger from './lib/logger';
import { ForeignChainsIds } from './types/ChainsIds';

logger.info('Starting Scheduler...');

(async (): Promise<void> => {
  const settings: Settings = Application.get('Settings');
  const logger: Logger = Application.get('Logger');
  const blockSynchronizerWorker = Application.get(BlockSynchronizerWorker);
  const blockResolverWorker = Application.get(BlockResolverWorker);
  const metricsWorker = Application.get(MetricsWorker);
  const foreignChainReplicationWorker = Application.get(ForeignChainReplicationWorker);

  const scheduleForeignChainReplication = async (
    foreignChainReplicationSettings: ForeignChainReplicationSettings,
    chainId: string
  ): Promise<void> => {
    try {
      await foreignChainReplicationWorker.enqueue(
        {
          foreignChainId: chainId,
          lockTTL: foreignChainReplicationSettings.lockTTL,
          interval: foreignChainReplicationSettings.interval,
        },
        {
          removeOnComplete: true,
          removeOnFail: true,
        }
      );
    } catch (e) {
      newrelic.noticeError(e);
      logger.error(e);
    }
  };

  for (const foreignChainId of ForeignChainsIds) {
    const foreignChainReplicationSettings: ForeignChainReplicationSettings = (<
      Record<string, ForeignChainReplicationSettings>
    >settings.jobs.foreignChainReplication)[foreignChainId];

    setInterval(
      async () => scheduleForeignChainReplication(foreignChainReplicationSettings, foreignChainId),
      foreignChainReplicationSettings.interval
    );
  }

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
        {
          interval: settings.jobs.blockCreation.interval,
        },
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
