import 'reflect-metadata';
import { expect } from 'chai';

import { MetricsRepository } from '../../src/repositories/MetricsRepository';
import { getTestContainer } from '../helpers/getTestContainer';
import { setupDatabase, teardownDatabase } from '../helpers/databaseHelpers';
import Block from '../../src/models/Block';
import { inputForBlockModel } from '../fixtures/inputForBlockModel';
import addDays from 'date-fns/addDays';

const container = getTestContainer();
container.bind(MetricsRepository).toSelf();
const metricsRepository = container.get(MetricsRepository);

describe('MetricsRepository', () => {
  before(async () => {
    await setupDatabase();

    await Block.create([
      { ...inputForBlockModel, _id: 'block::1', blockId: 1, voters: ['0xA405324F4b6EB7Bc76f1964489b3769cfc71445G'] },
    ]);
    await Block.create([{ ...inputForBlockModel, _id: 'block::2', blockId: 2 }]);
    await Block.create([{ ...inputForBlockModel, _id: 'block::3', blockId: 3 }]);
    await Block.create([
      { ...inputForBlockModel, _id: 'block::4', blockId: 4, voters: ['0xA405324F4b6EB7Bc76f1964489b3769cfc71445H'] },
    ]);
  });

  after(async () => {
    await Block.deleteMany({ _id: ['block::1', 'block::2', 'block::3', 'block::4'] });
    await teardownDatabase();
  });

  describe('#getVotersCount', () => {
    it('returns only the voter count', async () => {
      const endDateFormat = addDays(inputForBlockModel.dataTimestamp, 1);
      const votersCount = await metricsRepository.getVotersCount({
        startDate: inputForBlockModel.dataTimestamp,
        endDate: endDateFormat,
      });

      expect(votersCount).to.be.an('array');
      expect(votersCount).to.have.deep.members([
        {
          _id: '0xA405324F4b6EB7Bc76f1964489b3769cfc71445H',
          count: 1,
        },
        { _id: '0xA405324F4b6EB7Bc76f1964489b3769cfc71445G', count: 1 },
        { _id: '0xA405324F4b6EB7Bc76f1964489b3769cfc71445F', count: 2 },
      ]);
    });
  });
});
