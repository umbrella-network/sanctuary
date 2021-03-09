import './boot';
import Application from './lib/Application';
import BlockSynchronizerWorker from './workers/BlockSynchronizerWorker';
import Settings from './types/Settings';
import Server from './lib/Server';

(async (): Promise<void> => {
  const settings: Settings = Application.get('Settings');
  const blockSynchronizerWorker = Application.get(BlockSynchronizerWorker);

  setInterval(async () => {
    await blockSynchronizerWorker.enqueue({});
  }, settings.jobs.blockCreation.interval);

  Application.get(BlockSynchronizerWorker).start();

  Application.get(Server).start();
})();
