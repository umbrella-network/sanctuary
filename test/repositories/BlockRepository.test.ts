import 'reflect-metadata';
import { expect } from 'chai';
import { BlockRepository } from '../../src/repositories/BlockRepository';

import { getTestContainer } from '../helpers/getTestContainer';
import Block from '../../src/models/Block';

import { setupDatabase, teardownDatabase } from '../helpers/databaseHelpers';
import { blockAndLeafFactory } from '../mocks/factories/blockFactory';
import Leaf from '../../src/models/Leaf';

describe('BlockRepository', () => {
  let blockRepository: BlockRepository;

  before(async () => {
    await setupDatabase();
    await blockAndLeafFactory();
  });

  after(async () => {
    await Promise.all([Block.deleteMany(), Leaf.deleteMany()]);
    await teardownDatabase();
  });

  beforeEach(() => {
    const container = getTestContainer();
    container.bind(BlockRepository).toSelf();
    blockRepository = container.get(BlockRepository);
  });

  describe('#getLatestBlock', () => {
    it('returns only the latest block', async () => {
      const latestBlock = await blockRepository.getLatestBlock();

      expect(latestBlock).to.include({ _id: 'block::4', blockId: 4 });
    });
  });
});
