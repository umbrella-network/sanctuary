import { InfluxDB } from '@influxdata/influxdb-client';
import Settings from '../types/Settings';
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
        console.log(`InfluxDB '${url}' is now onboarded.`);
      } else {
        console.log(`InfluxDB '${url}' has been already onboarded.`);
      }
      console.log('\nFinished SUCCESS');
    })
    .catch((error: unknown) => {
      console.error(error);
      console.log('\nFinished ERROR');
    });
}
