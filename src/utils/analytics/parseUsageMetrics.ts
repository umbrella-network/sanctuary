import UsageMetrics from '../../types/analytics/UsageMetrics';
import { sub, closestTo } from 'date-fns';
import { LONG_NOTATION_FOR_MEASURE, removeMilliseconds } from '../time';
import { EVERY_N_FOR_PERIOD } from './usageMetricsUtils';
import { rangeFromDates } from '../rangeFromDates';

export const parseUsageMetrics = (rows: Array<any>, period: string ): Array<UsageMetrics> => {
  const { every, everyMeasure, bins } = EVERY_N_FOR_PERIOD[period];
  const subMeasure = LONG_NOTATION_FOR_MEASURE[everyMeasure];

  const endingTime = rows[rows.length - 1]._time;
  const startingTime = rows[0]._time;

  const dateRange = rangeFromDates(startingTime, endingTime, period);

  return dateRange.flatMap((date: string) => {
    const metric = rows.find(({ _time }) => removeMilliseconds(new Date(_time)) === date);

    if (!metric && date > endingTime) {
      return [];
    };

    const usageMetric: UsageMetrics = {
      time: date,
      amount: metric?._value || 0,
    };

    return usageMetric;
  });
};
