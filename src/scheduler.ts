import './boot';
import Application from './lib/Application';
import BlockSynchronizerWorker from './workers/BlockSynchronizerWorker';
import Settings from './types/Settings';

(async (): Promise<void> => {
  const settings: Settings = Application.get('Settings');
  const blockSynchronizerWorker = Application.get(BlockSynchronizerWorker);

  setInterval(async () => {
    await blockSynchronizerWorker.enqueue({});
  }, settings.jobs.blockCreation.interval);
})();
