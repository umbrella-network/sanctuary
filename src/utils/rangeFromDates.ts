import { differenceInHours, addHours } from 'date-fns';

export const rangeFromDates = (start: string, end: string, sliceEvery: number): Array<string> => {
  const differenceBetweenDates = differenceInHours(new Date(end), new Date(start));
  const amountOfTimeSlices = Math.ceil(differenceBetweenDates / sliceEvery) + 1;

  const range = new Array(amountOfTimeSlices).fill(undefined).map((_, slice) => {
    const isFirstSlice = slice === 0;
    const isLastSlice = slice === amountOfTimeSlices - 1;

    if (isFirstSlice) {
      return start;
    }

    if (isLastSlice) {
      return end;
    }

    return addHours(new Date(start), slice * sliceEvery).toISOString().slice(0, -5)+"Z";
  });

  return range;
};
