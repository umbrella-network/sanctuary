import { expect } from 'chai';
import { format, subDays } from 'date-fns';

import settings from '../../src/config/settings';
import { CountBlocksBetweenProps as Period } from '../../src/repositories/BlockRepository';
import { createPeriod } from '../../src/utils/period';

describe('createPeriod', () => {
  const minSearchRange = settings.signatures.minSearchRange;
  const maxSearchRange = settings.signatures.maxSearchRange;
  const datePattern = 'yyyy-MM-dd';

  function formatDate(date: Date): string {
    return format(date, datePattern);
  }

  function assertPeriod(period: Period<Date>, from: Date, to: Date): void {
    const { startDate, endDate } = period;

    expect(formatDate(startDate)).to.equal(formatDate(from));
    expect(formatDate(endDate)).to.equal(formatDate(to));
  }

  describe('when both start date and end date are not present', () => {
    it('returns the default period', () => {
      const expectedEndDate = new Date();
      const expectedStartDate = subDays(expectedEndDate, minSearchRange);

      const period = createPeriod({ startDate: undefined, endDate: undefined }, settings.signatures);

      assertPeriod(period, expectedStartDate, expectedEndDate);
    });
  });

  describe('when both start date and end date are invalid', () => {
    it('throws an error', () => {
      const startDate = 'this_date_is_invalid';
      const endDate = 'this_date_is_invalid';

      try {
        createPeriod({ startDate, endDate }, settings.signatures);
      } catch (e) {
        expect(e).to.be.instanceOf(Error);
        expect(e.message).to.include('Period is invalid. Format must be yyyy-mm-dd.');
      }
    });
  });

  describe('when both start date and end date are valid', () => {
    describe('and the range of the period is invalid', () => {
      it('throws an error', () => {
        const startDate = '2022-05-20';
        const endDate = '2022-05-10';

        try {
          createPeriod({ startDate, endDate }, settings.signatures);
        } catch (e) {
          expect(e).to.be.instanceOf(Error);
          expect(e.message).to.include('Period is invalid. startDate must be lower than endDate');
        }
      });
    });

    describe('and period exceeds maximum range', () => {
      it('throws an error', () => {
        const startDate = '2022-05-10';
        const endDate = '2022-05-25';

        try {
          createPeriod({ startDate, endDate }, settings.signatures);
        } catch (e) {
          expect(e).to.be.instanceOf(Error);
          expect(e.message).to.include(`Period range must be lower or equal than ${maxSearchRange} days.`);
        }
      });
    });

    describe('and period does not exceeds maximum range', () => {
      it('returns the period with the given dates', () => {
        const startDate = '2022-05-05';
        const endDate = '2022-05-10';

        const expectedEndDate = new Date(endDate);
        const expectedStartDate = new Date(startDate);

        const period = createPeriod({ startDate, endDate }, settings.signatures);

        assertPeriod(period, expectedStartDate, expectedEndDate);
      });
    });
  });
});
