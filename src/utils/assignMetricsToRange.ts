import UsageMetrics from '../types/analytics/UsageMetrics';

export const assignMetricsToRange = (usageMetrics: Array<UsageMetrics>, dateRange: Array<string>): Array<UsageMetrics> => {
  const assignedMetrics = dateRange.map((date: string) => {
    const metric = usageMetrics.find(({ time }) => time === date);

    const usageMetric: UsageMetrics = {
      time: date,
      amount: metric?.amount || 0,
    };

    return usageMetric;
  });

  return assignedMetrics;
};
