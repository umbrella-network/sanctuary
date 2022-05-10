import { CountBlocksBetweenProps as Period } from '../repositories/BlockRepository';
import { subDays, isValid } from 'date-fns';

const MAX_PERIOD_RANGE = 7;
const MAX_PERIOD_RANGE_IN_SECONDS = MAX_PERIOD_RANGE * 24 * 60 * 60;
export const MINUTE = 'm';
export const HOUR = 'h';
export const DAY = 'd';
export const WEEK = 'w';
export const MONTH = 'mo';

export const LONG_NOTATION_FOR_MEASURE: { [key: string]: string | number } = {
  [MINUTE]: 'minutes',
  [HOUR]: 'hours',
  [DAY]: 'days',
  [WEEK]: 'weeks',
};

export const removeMillisecondsFromIsoDate = (date: Date): string => {
  return `${date.toISOString().slice(0, -5)}Z`;
};

export const getDateAtMidnight = (day: string): Date => {
  const date = new Date(day);

  date.setUTCHours(0);
  date.setUTCMinutes(0);
  date.setUTCSeconds(0);

  return date;
};

export const getDateOrDefault = ({ startDate, endDate }: Period<string>): Period<Date> => {
  const end = isValid(new Date(endDate)) ? new Date(endDate) : new Date();
  const start = isValid(new Date(startDate)) ? new Date(startDate) : subDays(end, 1);

  return validatePeriod({ startDate: start, endDate: end });
};

const validatePeriod = (period: Period<Date>): Period<Date> => {
  if (isPeriodRangeValid(period) && isPeriodBelowThreshold(period, MAX_PERIOD_RANGE_IN_SECONDS)) {
    return period;
  }

  return {
    startDate: subDays(period.endDate, MAX_PERIOD_RANGE),
    endDate: period.endDate,
  };
};

const isPeriodRangeValid = (period: Period<Date>): boolean => {
  return period.endDate.getTime() > period.startDate.getTime();
};

const isPeriodBelowThreshold = (
  { startDate, endDate }: Period<Date>,
  threshold = MAX_PERIOD_RANGE_IN_SECONDS
): boolean => {
  const currentPeriodTime = endDate.getTime() / 1000 - startDate.getTime() / 1000;
  return currentPeriodTime < threshold;
};
