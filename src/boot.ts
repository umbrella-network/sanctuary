import 'newrelic';
import 'reflect-metadata';
import dotenv from 'dotenv';
import './config/initMongoDB';
import initMongoDB from './config/initMongoDB';

(async () => {
  if (process.env.NODE_ENV === 'testing') {
    dotenv.config({ path: '.testing.env' });
  } else {
    dotenv.config();
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { default: settings } = await require('./config/settings');

  await initMongoDB(settings);
})();
