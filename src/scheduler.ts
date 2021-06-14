import './boot';
import Application from './lib/Application';
import BlockSynchronizerWorker from './workers/BlockSynchronizerWorker';
import BlockResolverWorker from './workers/BlockResolverWorker';
import MetricsWorker from './workers/MetricsWorker';
import Settings from './types/Settings';

(async (): Promise<void> => {
  const settings: Settings = Application.get('Settings');
  const blockSynchronizerWorker = Application.get(BlockSynchronizerWorker);
  const blockResolverWorker = Application.get(BlockResolverWorker);
  const metricsWorker = Application.get(MetricsWorker);

  setInterval(async () => {
    await metricsWorker.enqueue({});
  }, settings.jobs.metricsReporting.interval);

  setInterval(async () => {
    await blockSynchronizerWorker.enqueue({});
  }, settings.jobs.blockCreation.interval);

  setInterval(async () => {
    await blockResolverWorker.enqueue({});
  }, settings.jobs.blockCreation.interval);
})();
