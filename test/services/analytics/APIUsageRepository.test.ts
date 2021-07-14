import { InfluxDB, Point } from '@influxdata/influxdb-client';

import APIUsageRepository from '../../../src/services/analytics/APIUsageRepository';
import { eraseBucket } from '../../../src/services/analytics/influxUtils';

import influxConn from '../../../src/services/analytics/influxConnection';
import { settings } from '../../../src/config/initInfluxDB';
import { expect } from 'chai';

const { org, bucket } = settings.influxDB;

describe.only('APIUsageRepository', () => {
  describe('#register and #retrieve', () => {
    beforeEach(async () => {
      await eraseBucket(influxConn, bucket);
    });

    it('saves the usage entry and retrieves it', async () => {
      const API_KEY = 'blabla123';

      APIUsageRepository.register({ apiKey: API_KEY, route: 'index' });

      const rows = await APIUsageRepository.retrieve(API_KEY, 12);
      expect(rows).to.have.length(1);
    });
  });

  // describe('#register', () => {
  //   it('saves the usage entry', async () => {
  //     const API_KEY = 'blabla123';
  //     APIUsageRepository.register({ apiKey: API_KEY, route: 'index' });

  //     const fluxQuery = `from(bucket:"${bucket}") |> range(start: 0) |> filter(fn: (r) => r.apiKey == "${API_KEY}")`;

  //     console.log(fluxQuery);
  //     const queryApi = influxConn.getQueryApi(org);
  //     const rows = await queryApi.collectRows(fluxQuery);
  //     console.log(rows);
  //     expect(rows).to.have.length(1);
  //   });
  // });

  // describe('#retrieve', () => {
  //   beforeEach(() => {
  //     const writeApi = influxConn.getWriteApi(org, bucket, 'ms');

  //     const point = new Point('apiUsage')
  //       .tag('apiKey', 'blabla123')
  //       .tag('route', 'index')
  //       .stringField('type', 'access');

  //     writeApi.writePoint(point);

  //     writeApi.close();
  //   });
  //   it('returns the usage entries', async () => {
  //     const rows = await APIUsageRepository.retrieve('blabla', 1);

  //     expect(rows).to.have.length(1);
  //   });
  // });
});
