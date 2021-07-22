import { InfluxDB } from '@influxdata/influxdb-client';
import { IsOnboarding, SetupAPI } from '@influxdata/influxdb-client-apis';

export const settings = {
  influxDB: {
    url: 'http://localhost:8086',
    org: 'sanctuary',
    username: 'sanctuary',
    password: 'veryStrongPassword',
    bucket: 'sanctuary',
    token: 'sanctuary:veryStrongPassword',
  },
};

const { url, org, bucket, username, password, token } = settings.influxDB;

export default async function initInfluxDB(): Promise<void> {
  const setupAPI = new SetupAPI(new InfluxDB({ url: url }));

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

initInfluxDB();
