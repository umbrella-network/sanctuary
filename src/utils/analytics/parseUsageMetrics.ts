import UsageMetrics from '../../types/analytics/UsageMetrics';
import { LONG_NOTATION_FOR_MEASURE, removeMillisecondsFromIsoDate } from '../time';
import { EVERY_N_FOR_PERIOD } from './usageMetricsUtils';
import { orderBy } from 'lodash';
import { rangeFromDates } from '../rangeFromDates';

export const parseUsageMetrics = (rows: Array<any>, period?: string): Array<UsageMetrics> => {
  if (!rows.length) {
    return rows;
  }

  if (!period) {
    return orderBy(rows, '_time', 'desc').map((row: any) => {
      const usageMetric: UsageMetrics = {
        time: row._time,
        apiKey: row.apiKey,
        route: row.route,
        method: row.method,
      };

      return usageMetric;
    });
  }

  const { everyMeasure } = EVERY_N_FOR_PERIOD[period];
  const subMeasure = LONG_NOTATION_FOR_MEASURE[everyMeasure];

  const endingTime = rows[rows.length - 1]._time;
  const startingTime = rows[0]._time;

  const dateRange = rangeFromDates(startingTime, endingTime, period);

  return orderBy(
    dateRange.flatMap((date: string) => {
      const metric = rows.find(({ _time }) => removeMillisecondsFromIsoDate(new Date(_time)) === date);

      if (!metric && date > endingTime) {
        return [];
      }

      const usageMetric: UsageMetrics = {
        time: date,
        amount: metric?._value || 0,
      };

      return usageMetric;
    }),
    'time',
    'desc'
  );
};
