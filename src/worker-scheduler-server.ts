import './boot';
import Application from './lib/Application';
import BlockSynchronizerWorker from './workers/BlockSynchronizerWorker';
import BlockResolverWorker from './workers/BlockResolverWorker';
import Settings from './types/Settings';
import Server from './lib/Server';
import { Logger } from 'winston';

(async (): Promise<void> => {
  const settings: Settings = Application.get('Settings');
  const logger: Logger = Application.get('Logger');
  const blockSynchronizerWorker = Application.get(BlockSynchronizerWorker);
  const blockResolverWorker = Application.get(BlockResolverWorker);

  setInterval(async () => {
    try {
      await blockSynchronizerWorker.enqueue({});
    } catch (e) {
      logger.error(e);
    }
  }, settings.jobs.blockCreation.interval);

  setInterval(async () => {
    try {
      await blockResolverWorker.enqueue({});
    } catch (e) {
      logger.error(e);
    }
  }, settings.jobs.blockCreation.interval);

  Application.get(BlockSynchronizerWorker).start();
  Application.get(BlockResolverWorker).start();

  Application.get(Server).start();
})();
