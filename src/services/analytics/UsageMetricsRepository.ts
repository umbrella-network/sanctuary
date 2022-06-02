import UsageMetrics from '../../types/analytics/UsageMetrics';
import { EVERY_N_FOR_PERIOD, validatePeriodHours } from '../../utils/analytics/usageMetricsUtils';
import { parseUsageMetrics } from '../../utils/analytics/parseUsageMetrics';
import { Point } from '@influxdata/influxdb-client';
import influxConn from './influx';
import settings from '../../config/settings';

import * as influxUtils from './influxUtils';

const { org, bucket } = settings.influxDB;

export default class UsageMetricsRepository {
  static async retrieveUsageMetrics(apiKeys: Array<string>, period?: string): Promise<UsageMetrics[]> {
    const fluxQuery = this.getQueryForApiKeysAndPeriod(apiKeys, period);

    const rows = await influxUtils.collectRowsFromQuery(fluxQuery, influxConn, org, bucket);

    return parseUsageMetrics(rows, period);
  }

  static async register(apiKey: string, route: string, method: string): Promise<void> {
    const point = new Point('apiKey')
      .tag('apiKey', apiKey)
      .tag('route', route)
      .tag('method', method)
      .stringField('type', 'access');

    await influxUtils.registerPoint(point, influxConn, org, bucket);
  }

  private static getQueryForApiKeysAndPeriod(apiKeys: Array<string>, period?: string): string {
    if (period) {
      validatePeriodHours(period);

      const { every, everyMeasure } = EVERY_N_FOR_PERIOD[period];

      return `|> range(start: -${period})
      |> filter(fn: (r) => contains(value: r.apiKey, set: ${JSON.stringify(apiKeys)}))
      |> aggregateWindow(
        column: "_time",
        every: ${every}${everyMeasure},
        fn: unique,
        createEmpty: true,
      )
      |> group(columns: ["_time"])
        |> count()`;
    }

    return `
      |> range(start: -1mo)
      |> filter(fn: (r) => contains(value: r.apiKey, set: ${JSON.stringify(apiKeys)}))`;
  }
}
