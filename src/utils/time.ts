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

export const setDateToZeroTime = (day: Date): Date => {
  day.setUTCHours(0);
  day.setUTCMinutes(0);
  day.setUTCSeconds(0);

  return day;
};
