import { expect } from 'chai';
import { countSignatureRate } from '../../src/utils/countSignatureRate';

describe('countSignatureRate', () => {
  it('returns the participation rate with at most 2 decimal cases', () => {
    const numberOfBlocks = 3;
    const voters = [
      { _id: '0xABC123', count: 1 },
      { _id: '0xDEF456', count: 2 },
      { _id: '0xGHI789', count: 3 },
      { _id: '0xJKL123', count: 0 },
    ];
    const expected = [
      { _id: '0xABC123', participationRate: 33.33 },
      { _id: '0xDEF456', participationRate: 66.67 },
      { _id: '0xGHI789', participationRate: 100 },
      { _id: '0xJKL123', participationRate: 0 },
    ];

    const actual = countSignatureRate(voters, numberOfBlocks);
    expect(actual).to.eql(expected);
  });

  describe('when no block numbers are found', () => {
    it('returns a participationRate of zero', () => {
      const numberOfBlocks = 0;
      const voters = [{ _id: '0xABC123', count: 10 }];
      const expected = {
        _id: '0xABC123',
        participationRate: 0,
      };

      const actual = countSignatureRate(voters, numberOfBlocks);
      expect(actual[0]).to.eql(expected);
    });
  });
});
