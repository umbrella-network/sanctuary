import { Point } from '@influxdata/influxdb-client';
import UsageData from '../../types/analytics/UsageData';
import UsageMetrics from '../../types/analytics/UsageMetrics';
import { EVERY_N_FOR_PERIOD, validatePeriodHours } from '../../utils/analytics/usageMetricsUtils';
import { parseUsageMetrics } from '../../utils/analytics/parseUsageMetrics';
import { settings } from '../../config/initInfluxDB';

import influxConn from './influxConnection';

const { org, bucket } = settings.influxDB;

const MEASUREMENT_NAME = 'apiUsage';

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

  static async retrieveUsageMetrics(apiKeys: Array<string>, period: string): Promise<UsageMetrics[]> {
    validatePeriodHours(period);

    const queryApi = influxConn.getQueryApi(org);

    const { every, everyMeasure } = EVERY_N_FOR_PERIOD[period];

    const fluxQuery = `from(bucket:"${bucket}")
      |> range(start: -${period})
      |> filter(fn: (r) => contains(value: r.apiKey, set: ${JSON.stringify(apiKeys)}))
      |> sort(desc: true)
      |> aggregateWindow(
        column: "_time",
        every: ${every}${everyMeasure},
        fn: unique,
        createEmpty: true,
      )
      |> group(columns: ["_time"])
        |> count()`;

    const rows = await queryApi.collectRows(fluxQuery);

    const usageMetrics = parseUsageMetrics(rows, period);

    return usageMetrics;
  }
}
