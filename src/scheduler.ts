import './boot';
import { Logger } from 'winston';

import Application from './lib/Application';
import BlockSynchronizerWorker from './workers/BlockSynchronizerWorker';
import BlockResolverWorker from './workers/BlockResolverWorker';
import MetricsWorker from './workers/MetricsWorker';
import { ForeignChainReplicationWorker } from './workers';
import Settings, { SinglentonWorkerSchedulerSettings } from './types/Settings';
import logger from './lib/logger';
import Migrations from './services/Migrations';
import { ChainsIds, ForeignChainsIds } from './types/ChainsIds';
import BasicWorker from './workers/BasicWorker';

logger.info('Starting Scheduler...');

(async (): Promise<void> => {
  const settings: Settings = Application.get('Settings');
  const logger: Logger = Application.get('Logger');
  const blockSynchronizerWorker = Application.get(BlockSynchronizerWorker);
  const blockResolverWorker = Application.get(BlockResolverWorker);
  const metricsWorker = Application.get(MetricsWorker);
  const foreignChainReplicationWorker = Application.get(ForeignChainReplicationWorker);
  const jobCode = String(Math.floor(Math.random() * 1000));

  await Migrations.apply();

  const scheduleWorker = async (worker: BasicWorker, chainId: string): Promise<void> => {
    try {
      await worker.enqueue(
        {
          chainId,
        },
        {
          removeOnComplete: true,
          removeOnFail: true,
          jobId: `${worker.queueName}-${chainId}-${jobCode}`,
        }
      );
    } catch (e) {
      logger.error(e);
    }
  };

  for (const foreignChainId of ForeignChainsIds) {
    if (foreignChainId !== ChainsIds.SOLANA) {
      logger.info(`foreignChainReplicationWorker for ${foreignChainId} skipped`);
      continue;
    }

    const schedulerSettings: SinglentonWorkerSchedulerSettings = (<Record<string, SinglentonWorkerSchedulerSettings>>(
      settings.jobs.chainsWorkerSchedulerSettings
    ))[foreignChainId];

    setInterval(async () => scheduleWorker(foreignChainReplicationWorker, foreignChainId), schedulerSettings.interval);
  }

  for (const chainId of Object.keys(settings.blockchain.multiChains)) {
    const schedulerSettings: SinglentonWorkerSchedulerSettings = (<Record<string, SinglentonWorkerSchedulerSettings>>(
      settings.jobs.chainsWorkerSchedulerSettings
    ))[chainId];

    logger.info(`scheduleWorker blockResolverWorker(${chainId}), interval ${schedulerSettings.interval}ms`);

    setInterval(async () => scheduleWorker(blockResolverWorker, chainId), schedulerSettings.interval);
  }

  setInterval(async () => {
    await metricsWorker.enqueue(
      {},
      {
        removeOnComplete: true,
        removeOnFail: true,
        jobId: `${metricsWorker.queueName}-${jobCode}`,
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
          jobId: `${blockSynchronizerWorker.queueName}-${jobCode}`,
        }
      );
    } catch (e) {
      logger.error(e);
    }
  }, settings.jobs.blockCreation.interval);
})();
