import 'reflect-metadata';
import { expect } from 'chai';
import LeafRepository from '../../src/repositories/LeafRepository';

import { getTestContainer } from '../helpers/getTestContainer';
import Leaf from '../../src/models/Leaf';

import leaves from '../mocks/leaves.json';
import { setupDatabase, teardownDatabase } from '../helpers/databaseHelpers';

describe('LeafRepository', () => {
  let leafRepository: LeafRepository;

  before(async () => {
    await setupDatabase();
    await Leaf.deleteMany();
    await Promise.all(leaves.map((leaf) => Leaf.create(leaf)));
  });

  after(async () => {
    await teardownDatabase();
  });

  beforeEach(() => {
    const container = getTestContainer();
    container.bind(LeafRepository).toSelf();
    leafRepository = container.get(LeafRepository);
  });

  describe('#getLeaves', () => {
    it('returns only the keys of the leaves', async () => {
      const keys = await leafRepository.getKeys();

      expect(keys).to.be.an('array');
      keys.forEach((key) => expect(key).to.be.string);
    });

    it('returns the keys without duplicates', async () => {
      const keys = await leafRepository.getKeys();

      const keySet = new Set<string>(keys);
      const uniqueKeys = Array.from(keySet);

      expect(keys).to.be.eql(uniqueKeys);
    });

    it('returns the keys sorted alphabetically', async () => {
      const keys = await leafRepository.getKeys();
      const sortedKeys = keys.sort((a, b) => {
        if (a < b) return -1;
        if (a > b) return 1;
        return 0;
      });

      expect(keys).to.be.eql(sortedKeys);
    });
  });
});
