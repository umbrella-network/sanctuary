import 'reflect-metadata';
import { expect } from 'chai';
import addDays from 'date-fns/addDays';

import { MetricsQueries } from '../../src/queries/MetricsQueries';
import { getTestContainer } from '../helpers/getTestContainer';
import { setupDatabase, teardownDatabase } from '../helpers/databaseHelpers';
import Block from '../../src/models/Block';
import { inputForBlockModel } from '../fixtures/inputForBlockModel';
import leaves from '../mocks/leaves.json';
import Leaf from '../../src/models/Leaf';

const container = getTestContainer();
container.bind(MetricsQueries).toSelf();
const metricsQueries = container.get(MetricsQueries);

describe('MetricsQueries', () => {
  before(async () => {
    await setupDatabase();
    await Leaf.deleteMany();

    await Block.create([
      {
        ...inputForBlockModel,
        _id: 'block::1',
        blockId: 1,
        voters: ['0xA405324F4b6EB7Bc76f1964489b3769cfc71445G'],
        status: 'canceled',
      },
    ]);
    await Block.create([{ ...inputForBlockModel, _id: 'block::2', blockId: 2 }]);
    await Block.create([{ ...inputForBlockModel, _id: 'block::3', blockId: 3 }]);
    await Block.create([
      { ...inputForBlockModel, _id: 'block::4', blockId: 4, voters: ['0xA405324F4b6EB7Bc76f1964489b3769cfc71445H'] },
    ]);

    await Promise.all(leaves.map((leaf) => Leaf.create(leaf)));
  });

  after(async () => {
    await Block.deleteMany({ _id: ['block::1', 'block::2', 'block::3', 'block::4'] });
    await Leaf.deleteMany();
    await teardownDatabase();
  });

  describe('#getVotersCount', () => {
    it('returns only the voter count from finalized blocks', async () => {
      const endDateFormat = addDays(inputForBlockModel.dataTimestamp, 1);
      const votersCount = await metricsQueries.getVotersCount({
        startDate: inputForBlockModel.dataTimestamp,
        endDate: endDateFormat,
      });

      expect(votersCount).to.be.an('array');
      expect(votersCount).to.have.deep.members([
        {
          _id: '0xA405324F4b6EB7Bc76f1964489b3769cfc71445H',
          count: 1,
        },
        { _id: '0xA405324F4b6EB7Bc76f1964489b3769cfc71445F', count: 2 },
      ]);
    });
  });

  describe('#getKeysCount', () => {
    it('returns the keys count from leafs with blockId bigger than given', async () => {
      const startBlockNumber = 169269;
      const endBlockNumber = 169271;
      const keysCount = await metricsQueries.getKeysCount(startBlockNumber, endBlockNumber);

      expect(keysCount).to.be.an('array');
      expect(keysCount).to.deep.include({
        _id: 'BCH-BTC',
        count: 2,
      });
    });
  });
});
