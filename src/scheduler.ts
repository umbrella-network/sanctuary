import './boot';
import { Logger } from 'winston';
import newrelic from 'newrelic';

import Application from './lib/Application';
import BlockSynchronizerWorker from './workers/BlockSynchronizerWorker';
import BlockResolverWorker from './workers/BlockResolverWorker';
import MetricsWorker from './workers/MetricsWorker';
import { ForeignChainReplicationWorker } from './workers';
import Settings, { SinglentonWorkerSchedulerSettings } from './types/Settings';
import logger from './lib/logger';
import Migrations from './services/Migrations';
import { ForeignChainsIds } from './types/ChainsIds';
import { SingletonWorker } from './workers/SingletonWorker';

logger.info('Starting Scheduler...');

(async (): Promise<void> => {
  const settings: Settings = Application.get('Settings');
  const logger: Logger = Application.get('Logger');
  const blockSynchronizerWorker = Application.get(BlockSynchronizerWorker);
  const blockResolverWorker = Application.get(BlockResolverWorker);
  const metricsWorker = Application.get(MetricsWorker);
  const foreignChainReplicationWorker = Application.get(ForeignChainReplicationWorker);

  await Migrations.apply();

  const scheduleWorker = async (
    worker: SingletonWorker,
    workerSettings: SinglentonWorkerSchedulerSettings,
    chainId: string
  ): Promise<void> => {
    try {
      await worker.enqueue(
        {
          chainId,
          lockTTL: workerSettings.lockTTL,
          interval: workerSettings.interval,
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
    const foreignChainReplicationSettings: SinglentonWorkerSchedulerSettings = (<
      Record<string, SinglentonWorkerSchedulerSettings>
    >settings.jobs.foreignChainReplication)[foreignChainId];

    setInterval(
      async () => scheduleWorker(foreignChainReplicationWorker, foreignChainReplicationSettings, foreignChainId),
      foreignChainReplicationSettings.interval
    );
  }

  for (const chainId of Object.keys(settings.blockchain.multiChains)) {
    const schedulerSettings: SinglentonWorkerSchedulerSettings = (<Record<string, SinglentonWorkerSchedulerSettings>>(
      settings.jobs.foreignChainReplication
    ))[chainId];

    setInterval(
      async () => scheduleWorker(blockResolverWorker, schedulerSettings, chainId),
      settings.jobs.blockCreation.interval // TODO individual settings?
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
          lockTTL: settings.jobs.blockCreation.lockTTL,
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
})();
