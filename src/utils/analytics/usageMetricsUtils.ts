const validPeriods = ['1h', '12h', '24h', '48h', '1w', '1mo'];
import { MINUTE, HOUR, DAY } from '../time';

export const EVERY_N_FOR_PERIOD: { [key: string]: { every: number; everyMeasure: string; bins: number } } = {
  '1h': {
    every: 5,
    everyMeasure: MINUTE,
    bins: 12,
  },
  '12h': {
    every: 1,
    everyMeasure: HOUR,
    bins: 12,
  },
  '24h': {
    every: 2,
    everyMeasure: HOUR,
    bins: 12,
  },
  '48h': {
    every: 4,
    everyMeasure: HOUR,
    bins: 12,
  },
  '1w': {
    every: 1,
    everyMeasure: DAY,
    bins: 7,
  },
  '1mo': {
    every: 2,
    everyMeasure: DAY,
    bins: 30,
  },
};

export const validatePeriodHours = (period: string): void => {
  if (!validPeriods.includes(period)) {
    throw `periodHours must be one of ${validPeriods.join()}`;
  }
};
