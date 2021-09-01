
import 'reflect-metadata';
import './config/setupDotenv';
import './config/setupNewrelic';
import initMongoDB from './config/initMongoDB';
import Migrations from './services/Migrations';

(async () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { default: settings } = await require('./config/settings');

  await initMongoDB(settings);
  await Migrations.apply();
})();
