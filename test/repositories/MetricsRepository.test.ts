import 'reflect-metadata';
import { expect } from 'chai';

import { MetricsRepository } from '../../src/repositories/MetricsRepository';
import { getTestContainer } from '../helpers/getTestContainer';
import { setupDatabase, teardownDatabase } from '../helpers/databaseHelpers';

describe('MetricsRepository', () => {
  let metricsRepository: MetricsRepository;

  before(async () => {
    await setupDatabase();
  });

  after(async () => {
    await teardownDatabase();
  });

  beforeEach(() => {
    const container = getTestContainer();
    container.bind(MetricsRepository).toSelf();
    metricsRepository = container.get(MetricsRepository);
  });

  describe('#getLeaves', () => {
    it('returns only the voter count', async () => {
      const votersCount = await metricsRepository.getVotersCount({
        startDate: new Date('2021-12-01'),
        endDate: new Date('2021-12-02'),
      });

      expect(votersCount).to.be.an('array');
      votersCount.forEach((voter) => {
        expect(voter._id).to.be.a('string');
        expect(voter.count).to.be.a('number');
      });
    });
  });
});
