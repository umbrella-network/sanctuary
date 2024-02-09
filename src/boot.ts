import 'reflect-metadata';
import './config/setupDotenv';
import initMongoDB from './config/initMongoDB';
import logger from './lib/logger';

(async () => {
  logger.info('Booting up...');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { default: settings } = await require('./config/settings');

  await initMongoDB(settings);
})();
