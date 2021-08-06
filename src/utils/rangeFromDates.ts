import { add } from 'date-fns';
import { LONG_NOTATION_FOR_MEASURE, removeMillisecondsFromIsoDate } from './time';
import { uniq } from 'lodash';
import { EVERY_N_FOR_PERIOD } from './analytics/usageMetricsUtils';

export const rangeFromDates = (start: string, end: string, period: string): Array<string> => {
  if (start === end) {
    return [removeMillisecondsFromIsoDate(new Date(end))];
  }

  const { every, everyMeasure, bins } = EVERY_N_FOR_PERIOD[period];
  const addMeasure = LONG_NOTATION_FOR_MEASURE[everyMeasure];

  const range = new Array(bins).fill(undefined).map((_, slice) => {
    const isFirstSlice = slice === 0;
    const isLastSlice = slice === bins - 1;

    if (isFirstSlice) {
      return removeMillisecondsFromIsoDate(new Date(start));
    }

    if (isLastSlice) {
      return removeMillisecondsFromIsoDate(new Date(end));
    }

    return removeMillisecondsFromIsoDate(add(new Date(start), { [addMeasure]: slice * every }));
  });

  return uniq(range);
};
