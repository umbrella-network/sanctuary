import { expect } from 'chai';
import { CreateBatchRanges } from '../../src/services/CreateBatchRanges';

describe('CreateBatchRanges', () => {
  it('creates ranges', () => {
    return expect(CreateBatchRanges.apply(0, 10, 4)).deep.eq([
      [0, 3],
      [4, 7],
      [8, 10],
    ]);
  });
});
