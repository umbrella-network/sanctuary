import { CountBlocksBetweenProps as Period } from '../repositories/BlockRepository';
import { subDays, isValid } from 'date-fns';

interface Config {
  minSearchRange: number;
  maxSearchRange: number;
  maxSearchRangeInSeconds: number;
}

export const createPeriod = ({ startDate, endDate }: Period<string>, config: Config): Period<Date> => {
  if (!startDate && !endDate) {
    return defaultPeriod(config);
  }

  if (!isValid(new Date(startDate)) || !isValid(new Date(endDate))) {
    throw new Error('Period is invalid. Format must be yyyy-mm-dd.');
  }

  const period: Period<Date> = {
    startDate: new Date(startDate),
    endDate: new Date(endDate),
  };

  if (!isPeriodRangeValid(period)) {
    throw new Error('Period is invalid. startDate must be lower than endDate');
  }

  if (!isPeriodBelowThreshold(period, config.maxSearchRangeInSeconds)) {
    throw new Error(`Period range must be lower or equal than ${config.maxSearchRange} days.`);
  }

  return period;
};

const defaultPeriod = (config: Config): Period<Date> => ({
  startDate: subDays(new Date(), config.minSearchRange),
  endDate: new Date(),
});

const isPeriodRangeValid = (period: Period<Date>): boolean => {
  return period.endDate.getTime() > period.startDate.getTime();
};

const isPeriodBelowThreshold = ({ startDate, endDate }: Period<Date>, threshold: number): boolean => {
  const currentPeriodTime = endDate.getTime() / 1000 - startDate.getTime() / 1000;
  return currentPeriodTime < threshold;
};
