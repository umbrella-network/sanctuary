import './boot';
import Application from './lib/Application';
import BlockSynchronizerWorker from './workers/BlockSynchronizerWorker';
import BlockResolverWorker from './workers/BlockResolverWorker';
import Settings from './types/Settings';

(async (): Promise<void> => {
  const settings: Settings = Application.get('Settings');
  const blockSynchronizerWorker = Application.get(BlockSynchronizerWorker);
  const blockResolverWorker = Application.get(BlockResolverWorker);

  setInterval(async () => {
    await blockSynchronizerWorker.enqueue({});
  }, settings.jobs.blockCreation.interval);

  setInterval(async () => {
    await blockResolverWorker.enqueue({});
  }, settings.jobs.blockCreation.interval);
})();
