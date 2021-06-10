import dotenv from 'dotenv';
dotenv.config();

process.env['NEW_RELIC_ENABLED'] = process.env['NEW_RELIC_ENABLED'] || 'false';
import 'newrelic';

import 'reflect-metadata';
import './config/initMongoDB';
import initMongoDB from './config/initMongoDB';
import Migrations from './services/Migrations';

(async () => {
  if (process.env.NODE_ENV === 'testing') {
    dotenv.config({ path: '.testing.env' });
  } else {
    dotenv.config();
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { default: settings } = await require('./config/settings');

  await initMongoDB(settings);
  await Migrations.apply();
})();
