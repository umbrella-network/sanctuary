import { add } from 'date-fns';
import { LONG_NOTATION_FOR_MEASURE, removeMilliseconds } from './time';
import { EVERY_N_FOR_PERIOD } from './analytics/usageMetricsUtils';

export const rangeFromDates = (start: string, end: string, period: string): Array<string> => {
  const { every, everyMeasure, bins } = EVERY_N_FOR_PERIOD[period];
  const addMeasure = LONG_NOTATION_FOR_MEASURE[everyMeasure];

  const range = new Array(bins).fill(undefined).map((_, slice) => {
    const isFirstSlice = slice === 0;
    const isLastSlice = slice === bins - 1;

    if (isFirstSlice) {
      return removeMilliseconds(new Date(start));
    }

    if (isLastSlice) {
      return removeMilliseconds(new Date(end));
    }

    return removeMilliseconds(add(new Date(start), { [addMeasure]: slice * every }));
  });

  return range;
};
