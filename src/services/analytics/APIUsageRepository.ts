import { Point } from '@influxdata/influxdb-client';
import UsageData from '../../types/analytics/UsageData';
import { settings } from '../../config/initInfluxDB';

import influxConn from './influxConnection';

const { org, bucket } = settings.influxDB;

const MEASUREMENT_NAME = 'apiUsage';

type periodHours = 1 | 12 | 24 | 48;

export default class APIUsageRepository {
  static register(data: UsageData): void {
    const writeApi = influxConn.getWriteApi(org, bucket, 'ms');

    const point = new Point(MEASUREMENT_NAME)
      .tag('apiKey', data.apiKey)
      .tag('route', data.route)
      .stringField('type', 'access');

    writeApi.writePoint(point);

    writeApi.close();
  }

  static async retrieve(apiKey: string, periodHours: periodHours): Promise<UsageData[]> {
    const queryApi = influxConn.getQueryApi(org);

    const fluxQuery = `from(bucket:"${bucket}") 
      |> range(start: -${periodHours}h) 
      |> filter(fn: (r) => r.apiKey == "${apiKey}")`;

    try {
      const rows = await queryApi.collectRows(fluxQuery);
      return rows.map((row: any) => {
        const usageData: UsageData = {
          time: row._time,
          apiKey: row.apiKey,
          route: row.route,
        };

        return usageData;
      });
    } catch (err) {
      console.error(err);
    }
  }
}
