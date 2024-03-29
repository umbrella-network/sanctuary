import { expect } from 'chai';
import { getDateAtMidnight } from '../../src/utils/time';

describe('Time', () => {
  describe('#getDateAtMidnight', () => {
    describe('When a valid date is given', () => {
      it('should return the given date with time equals 00:00:00', () => {
        const day = getDateAtMidnight('2022-01-01');
        expect(day).to.eqls(new Date('2022-01-01T00:00:00Z'));
      });
    });
  });
});
