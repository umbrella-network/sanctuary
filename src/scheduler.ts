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
import { ForeignChainsIds, TForeignChainsIds } from './types/ChainsIds';
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
    const schedulerSettings: SinglentonWorkerSchedulerSettings = (<
      Record<string, SinglentonWorkerSchedulerSettings>
    >settings.jobs.chainsWorkerSchedulerSettings)[foreignChainId];

    setInterval(
      async () => scheduleWorker(foreignChainReplicationWorker, schedulerSettings, foreignChainId),
      schedulerSettings.interval
    );
  }

  const blockChainResolvers = Object.keys(settings.blockchain.multiChains).filter((chainId) => {
    if (ForeignChainsIds.includes(chainId as TForeignChainsIds)) {
      logger.info(`[${chainId}] skipping as it is still registered for replication`);
      return false;
    }

    return true;
  });

  for (const chainId of blockChainResolvers) {
    const schedulerSettings: SinglentonWorkerSchedulerSettings = (<Record<string, SinglentonWorkerSchedulerSettings>>(
      settings.jobs.chainsWorkerSchedulerSettings
    ))[chainId];

    logger.info(`scheduleWorker blockResolverWorker(${chainId})...`);

    setInterval(
      async () => scheduleWorker(blockResolverWorker, schedulerSettings, chainId),
      schedulerSettings.interval
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
