import { Point } from '@influxdata/influxdb-client';
import UsageData from '../../types/analytics/UsageData';
import UsageMetrics from '../../types/analytics/UsageMetrics';
import { rangeFromDates } from '../../utils/rangeFromDates';
import { assignMetricsToRange } from '../../utils/assignMetricsToRange';
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

  static async retrieve(apiKeys: Array<string>, periodHours: periodHours): Promise<UsageMetrics[]> {
    const queryApi = influxConn.getQueryApi(org);

    const fluxQuery = `from(bucket:"${bucket}")
      |> range(start: -30d)
      |> filter(fn: (r) => contains(value: r.apiKey, set: ${JSON.stringify(apiKeys)}))
      |> sort(desc: true)
      |> aggregateWindow(
        column: "_time",
        every: ${periodHours}h,
        fn: unique,
        createEmpty: true,
      )
      |> group(columns: ["_time"])
        |> count()`;

    try {
      const rows = await queryApi.collectRows(fluxQuery);

      const rawUsageMetrics = rows.map((row: any) => {
        const usageMetric: UsageMetrics = {
          time: row._time,
          amount: row._value,
        };

        return usageMetric;
      });

      const startingTime = rawUsageMetrics[0].time;
      const endingTime = rawUsageMetrics[rawUsageMetrics.length - 1].time;

      const dateRange = rangeFromDates(startingTime, endingTime, periodHours);
      const usageMetrics = assignMetricsToRange(rawUsageMetrics, dateRange);

      return usageMetrics;
    } catch (err) {
      console.error(err);
    }
  }
}
