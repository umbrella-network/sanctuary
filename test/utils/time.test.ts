import { expect } from 'chai';
import { setToMidnight } from '../../src/utils/time';

describe('Time', () => {
  describe('When a valid date is given', () => {
    it('should return the given date with time equals 00:00:00', () => {
      const day = setToMidnight('2022-01-01');
      expect(day).to.eqls('2022-01-01T00:00:00Z');
    });
  });
});
