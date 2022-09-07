import 'reflect-metadata';
import request from 'supertest';
import { expect } from 'chai';
import { Application } from 'express';
import { Container } from 'inversify';

import { loadTestEnv } from '../../helpers';
import Block, { IBlock } from '../../../src/models/Block';
import Leaf from '../../../src/models/Leaf';
import { inputForBlockModel } from '../../fixtures/inputForBlockModel';
import { setupDatabase, teardownDatabase } from '../../helpers/databaseHelpers';
import { setupApiKey, teardownTestUser } from '../../helpers/authHelpers';
import { getContainer } from '../../../src/lib/getContainer';
import Server from '../../../src/lib/Server';
import { blockAndLeafFactory } from '../../mocks/factories/blockFactory';
import { IApiKey } from '../../../src/models/ApiKey';
import BlockChainData from '../../../src/models/BlockChainData';
import { blockChainDataFactory } from '../../mocks/factories/blockChainDataFactory';

describe('getBlocks', () => {
  let container: Container;
  let app: Application;

  before(async () => {
    loadTestEnv();
    await setupDatabase();
    await Promise.all([Block.deleteMany(), BlockChainData.deleteMany(), Leaf.deleteMany()]);
    container = getContainer();
    app = container.get(Server).app;
  });

  after(async () => {
    await teardownDatabase();
  });

  describe('GET /blocks', () => {
    describe('when no API Key is provided', () => {
      it('responds with HTTP 200', async () => {
        const response = await request(app).get('/blocks');
        expect(response.status).to.eq(200);
      });
    });

    describe('when an invalid API Key is provided', () => {
      it('responds with HTTP 401', async () => {
        const response = await request(app).get('/blocks').set('Authorization', 'Bearer wrongBearer');

        expect(response.status).to.eq(401);
      });
    });

    describe('when a valid API Key is provided', () => {
      let apiKey: IApiKey;

      beforeEach(async () => {
        apiKey = await setupApiKey();
      });

      afterEach(async () => {
        await Promise.all([Block.deleteMany(), BlockChainData.deleteMany(), Leaf.deleteMany(), teardownTestUser()]);
      });

      it('returns only finalized blocks', async () => {
        await Block.create([
          { ...inputForBlockModel, _id: 'block::1', blockId: 1, status: 'new' },
          { ...inputForBlockModel, _id: 'block::2', blockId: 2, status: 'completed' },
          { ...inputForBlockModel, _id: 'block::3', blockId: 3, status: 'failed' },
          { ...inputForBlockModel, _id: 'block::4', blockId: 4, status: 'finalized' },
        ]);

        await BlockChainData.create([blockChainDataFactory.build({ blockId: 4, chainId: 'bsc' })]);

        const blocksResponse = await request(app).get('/blocks').set('Authorization', `${apiKey.key}`);
        const blocks = blocksResponse.body;

        expect(blocks).to.be.an('array').with.lengthOf(1);
        expect(blocks[0]).to.have.property('status', 'finalized');
        expect(blocks[0]).to.have.property('chainAddress', 'CHAIN_ADDRESS');
      });

      it('returns blocks sorted in descending order by their height', async () => {
        await Block.create([
          { ...inputForBlockModel, _id: 'block::4', blockId: 4 },
          { ...inputForBlockModel, _id: 'block::1', blockId: 1 },
          { ...inputForBlockModel, _id: 'block::3', blockId: 3 },
          { ...inputForBlockModel, _id: 'block::2', blockId: 2 },
        ]);

        await BlockChainData.create([
          blockChainDataFactory.build({ blockId: 1, chainId: 'bsc' }),
          blockChainDataFactory.build({ blockId: 2, chainId: 'bsc' }),
          blockChainDataFactory.build({ blockId: 3, chainId: 'bsc' }),
          blockChainDataFactory.build({ blockId: 4, chainId: 'bsc' }),
        ]);

        const blocksResponse = await request(app).get('/blocks').set('Authorization', `${apiKey.key}`);
        const blocks: IBlock[] = blocksResponse.body;

        expect(blocks).to.be.an('array').with.lengthOf(4);

        blocks.forEach((block, i) => {
          if (i === 0) {
            return;
          }

          expect(block.blockId).to.be.lessThan(blocks[i - 1].blockId);
        });
      });
    });
  });

  describe('GET /blocks?limit=<n>&offset=<n>', () => {
    describe('when no API Key is provided', () => {
      it('responds with HTTP 200', async () => {
        const response = await request(app).get('/blocks?limit=2&offset=1');

        expect(response.status).to.eq(200);
      });
    });

    describe('when an invalid API Key is provided', () => {
      it('responds with HTTP 401', async () => {
        const response = await request(app).get('/blocks?limit=2&offset=1').set('Authorization', 'Bearer wrongBearer');

        expect(response.status).to.eq(401);
      });
    });

    describe('when a valid API Key is provided', () => {
      let apiKey: IApiKey;

      beforeEach(async () => {
        apiKey = await setupApiKey();
      });

      afterEach(async () => {
        await Promise.all([Block.deleteMany(), BlockChainData.deleteMany(), Leaf.deleteMany(), teardownTestUser()]);
      });

      it('returns blocks respecting limit and offset parameters', async () => {
        await Block.create([
          { ...inputForBlockModel, _id: 'block::1', blockId: 1 },
          { ...inputForBlockModel, _id: 'block::2', blockId: 2 },
          { ...inputForBlockModel, _id: 'block::3', blockId: 3 },
          { ...inputForBlockModel, _id: 'block::4', blockId: 4 },
        ]);

        await BlockChainData.create([
          blockChainDataFactory.build({ blockId: 1, chainId: 'bsc' }),
          blockChainDataFactory.build({ blockId: 2, chainId: 'bsc' }),
          blockChainDataFactory.build({ blockId: 3, chainId: 'bsc' }),
          blockChainDataFactory.build({ blockId: 4, chainId: 'bsc' }),
        ]);

        const blocksResponse = await request(app).get('/blocks?limit=2&offset=1').set('Authorization', `${apiKey.key}`);
        const blocks: IBlock[] = blocksResponse.body;

        expect(blocks).to.be.an('array').with.lengthOf(2);
        expect(blocks[0]).to.have.property('blockId', 3);
        expect(blocks[1]).to.have.property('blockId', 2);
      });
    });
  });

  describe('GET /blocks/:blockId', () => {
    describe('when no API Key is provided', () => {
      beforeEach(async () => {
        await blockAndLeafFactory();
      });

      afterEach(async () => {
        await Promise.all([Block.deleteMany(), BlockChainData.deleteMany(), Leaf.deleteMany()]);
      });

      it('responds with HTTP 200', async () => {
        const response = await request(app).get('/blocks/1');

        expect(response.status).to.eq(200);
      });
    });

    describe('when an invalid API Key is provided', () => {
      it('responds with HTTP 401', async () => {
        const response = await request(app).get('/blocks/1').set('Authorization', 'Bearer wrongBearer');

        expect(response.status).to.eq(401);
      });
    });

    describe('when a valid API Key is provided', () => {
      let apiKey: IApiKey;

      beforeEach(async () => {
        apiKey = await setupApiKey();
      });

      afterEach(async () => {
        await Promise.all([Block.deleteMany(), BlockChainData.deleteMany(), Leaf.deleteMany(), teardownTestUser()]);
      });

      describe('when an invalid block id is provided', () => {
        afterEach(async () => {
          await Promise.all([Block.deleteMany(), BlockChainData.deleteMany(), Leaf.deleteMany()]);
        });

        it('returns with HTTP 404', async () => {
          await Block.create([
            { ...inputForBlockModel, _id: 'block::1', blockId: 1 },
            { ...inputForBlockModel, _id: 'block::2', blockId: 2 },
            { ...inputForBlockModel, _id: 'block::3', blockId: 3 },
            { ...inputForBlockModel, _id: 'block::4', blockId: 4 },
          ]);

          await BlockChainData.create([
            blockChainDataFactory.build({ blockId: 1, chainId: 'bsc' }),
            blockChainDataFactory.build({ blockId: 2, chainId: 'bsc' }),
            blockChainDataFactory.build({ blockId: 3, chainId: 'bsc' }),
            blockChainDataFactory.build({ blockId: 4, chainId: 'bsc' }),
          ]);

          const blocksResponse = await request(app).get('/blocks/999').set('Authorization', `${apiKey.key}`);

          expect(blocksResponse.status).to.eq(404);
        });
      });

      describe('when a valid block id is provided', () => {
        afterEach(async () => {
          await Promise.all([Block.deleteMany(), BlockChainData.deleteMany(), Leaf.deleteMany()]);
        });

        it('returns block by its id', async () => {
          await Block.create([
            { ...inputForBlockModel, _id: 'block::1', blockId: 1 },
            { ...inputForBlockModel, _id: 'block::2', blockId: 2 },
            { ...inputForBlockModel, _id: 'block::3', blockId: 3 },
            { ...inputForBlockModel, _id: 'block::4', blockId: 4 },
          ]);

          await BlockChainData.create([
            blockChainDataFactory.build({ blockId: 1, chainId: 'bsc' }),
            blockChainDataFactory.build({ blockId: 2, chainId: 'bsc', _id: 'block::bsc::2' }),
            blockChainDataFactory.build({ blockId: 3, chainId: 'bsc' }),
            blockChainDataFactory.build({ blockId: 4, chainId: 'bsc' }),
          ]);

          const blocksResponse = await request(app).get('/blocks/2').set('Authorization', `${apiKey.key}`);
          const blocks: Record<string, unknown> = blocksResponse.body;

          expect(blocks.data).to.have.property('blockId', 2);
          expect(blocks.data).to.have.property('_id', 'block::bsc::2');
        });
      });
    });
  });

  describe('GET /blocks/:blockId/leaves', () => {
    describe('when no API Key is provided', () => {
      beforeEach(async () => {
        await blockAndLeafFactory();
      });

      afterEach(async () => {
        await Promise.all([Block.deleteMany(), BlockChainData.deleteMany(), Leaf.deleteMany()]);
      });

      it('responds with HTTP 200 with empty proof', async () => {
        const response = await request(app).get('/blocks/1/leaves');

        expect(response.status).to.eq(200);
        expect(response.body[0].proof).to.eqls([]);
      });
    });

    describe('when an invalid API Key is provided', () => {
      it('responds with HTTP 401', async () => {
        const response = await request(app).get('/blocks/1/leaves').set('Authorization', 'wrongAPIKey');

        expect(response.status).to.eq(401);
      });
    });

    describe('when a valid API Key is provided', () => {
      let apiKey: IApiKey;

      beforeEach(async () => {
        apiKey = await setupApiKey();
      });

      afterEach(async () => {
        await Promise.all([Block.deleteMany(), BlockChainData.deleteMany(), Leaf.deleteMany(), teardownTestUser()]);
      });

      it('returns leaves for a block', async () => {
        await blockAndLeafFactory();

        const leavesResponse = await request(app).get('/blocks/1/leaves').set('Authorization', `${apiKey.key}`);
        const leaves: Record<string, unknown>[] = leavesResponse.body;

        expect(leaves).to.be.an('array').with.lengthOf(2);
        leaves.forEach((leaf, index) => {
          expect(leaf).to.have.property('blockId', 1);
          expect(leaf.proof).to.eql([`proof${index + 1}`]);
        });
      });
    });
  });
});
