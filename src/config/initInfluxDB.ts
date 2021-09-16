import { InfluxDB } from '@influxdata/influxdb-client';
import Settings from '../types/Settings';
import logger from '../lib/logger';
import { IsOnboarding, SetupAPI } from '@influxdata/influxdb-client-apis';

export default async function initInfluxDB(settings: Settings): Promise<void> {
  const { url, org, bucket, username, password, token } = settings.influxDB;
  const setupAPI = new SetupAPI(new InfluxDB({ url }));

  setupAPI
    .getSetup()
    .then(async ({ allowed }: IsOnboarding) => {
      if (allowed) {
        await setupAPI.postSetup({
          body: {
            org,
            bucket,
            username,
            password,
            token,
          },
        });
        logger.debug(`InfluxDB '${url}' is now onboarded.`);
      } else {
        logger.debug(`InfluxDB '${url}' has been already onboarded.`);
      }
      logger.debug('Finished SUCCESS');
    })
    .catch((error: unknown) => {
      logger.error(error);
      logger.debug('Finished ERROR');
    });
}
