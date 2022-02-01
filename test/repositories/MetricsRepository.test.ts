import 'reflect-metadata';
import { expect } from 'chai';

import { MetricsRepository } from '../../src/repositories/MetricsRepository';
import { getTestContainer } from '../helpers/getTestContainer';
import { setupDatabase, teardownDatabase } from '../helpers/databaseHelpers';
import Block from '../../src/models/Block';
import { inputForBlockModel } from '../fixtures/inputForBlockModel';
import addDays from 'date-fns/addDays';

describe('MetricsRepository', () => {
  let metricsRepository: MetricsRepository;

  before(async () => {
    await setupDatabase();
    await Block.deleteOne({ _id: 'block::1' });
    await Block.create([{ ...inputForBlockModel, _id: 'block::1', blockId: 1, status: 'new' }]);
  });

  after(async () => {
    await Block.deleteOne({ _id: 'block::1' });
    await teardownDatabase();
  });

  beforeEach(() => {
    const container = getTestContainer();
    container.bind(MetricsRepository).toSelf();
    metricsRepository = container.get(MetricsRepository);
  });

  describe('#getVotersCount', () => {
    it('returns only the voter count', async () => {
      const endDateFormat = addDays(inputForBlockModel.dataTimestamp, 1);
      const votersCount = await metricsRepository.getVotersCount({
        startDate: inputForBlockModel.dataTimestamp,
        endDate: endDateFormat,
      });

      expect(votersCount).to.be.an('array');
      votersCount.forEach((voter) => {
        expect(voter._id).to.be.equal('0xA405324F4b6EB7Bc76f1964489b3769cfc71445F');
        expect(voter.count).to.be.equal(1);
      });
    });
  });
});
