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
import { setupJWKSMock, TestAuthHarness } from '../../helpers/authHelpers';
import { getContainer } from '../../../src/lib/getContainer';
import Server from '../../../src/lib/Server';

describe('getBlocks', () => {
  let container: Container;
  let app: Application;
  let authHarness: TestAuthHarness;

  before(async () => {
    loadTestEnv();
    await setupDatabase();
    container = getContainer();
    app = container.get(Server).app;
  });

  after(async () => {
    await teardownDatabase();
  });

  describe('GET /blocks', () => {
    describe('when no bearer token is provided', () => {
      it('responds with HTTP 401 Unauthorized', async () => {
        const response = await request(app).get('/blocks');
        expect(response.status).to.eq(401);
      });
    });

    describe('when an invalid bearer token is provided', () => {
      it('responds with HTTP 401 Unauthorized', async () => {
        const response = await request(app).get('/blocks').set('Authorization', 'Bearer wrgonBearer');
        expect(response.status).to.eq(401);
      });
    });

    describe('when a valid bearer token is provided', () => {
      beforeEach(async () => {
        authHarness = await setupJWKSMock();
      });

      afterEach(async () => {
        await authHarness.jwksMock.stop();
        await Promise.all([Block.deleteMany({}), Leaf.deleteMany({})]);
      });

      it('returns only finalized blocks', async () => {
        await Block.create([
          { ...inputForBlockModel, _id: 'block::1', blockId: 1, status: 'new' },
          { ...inputForBlockModel, _id: 'block::2', blockId: 2, status: 'completed' },
          { ...inputForBlockModel, _id: 'block::3', blockId: 3, status: 'failed' },
          { ...inputForBlockModel, _id: 'block::4', blockId: 4, status: 'finalized' },
        ]);

        const blocksResponse = await request(app)
          .get('/blocks')
          .set('Authorization', `Bearer ${authHarness.accessToken}`);
        const blocks = blocksResponse.body;

        expect(blocks).to.be.an('array').with.lengthOf(1);
        expect(blocks[0]).to.have.property('status', 'finalized');
      });

      it('returns blocks sorted in descending order by their height', async () => {
        await Block.create([
          { ...inputForBlockModel, _id: 'block::4', blockId: 4 },
          { ...inputForBlockModel, _id: 'block::1', blockId: 1 },
          { ...inputForBlockModel, _id: 'block::3', blockId: 3 },
          { ...inputForBlockModel, _id: 'block::2', blockId: 2 },
        ]);
        const blocksResponse = await request(app)
          .get('/blocks')
          .set('Authorization', `Bearer ${authHarness.accessToken}`);
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
    describe('when no bearer token is provided', () => {
      it('responds with HTTP 401 Unauthorized', async () => {
        const response = await request(app).get('/blocks?limit=2&offset=1');

        expect(response.status).to.eq(401);
      });
    });

    describe('when an invalid bearer token is provided', () => {
      it('responds with HTTP 401 Unauthorized', async () => {
        const response = await request(app).get('/blocks?limit=2&offset=1').set('Authorization', 'Bearer wrgonBearer');

        expect(response.status).to.eq(401);
      });
    });

    describe('when a valid bearer token is provided', () => {
      beforeEach(async () => {
        authHarness = await setupJWKSMock();
      });

      afterEach(async () => {
        await authHarness.jwksMock.stop();
        await Promise.all([Block.deleteMany({}), Leaf.deleteMany({})]);
      });

      it('returns blocks respecting limit and offset parameters', async () => {
        await Block.create([
          { ...inputForBlockModel, _id: 'block::1', blockId: 1 },
          { ...inputForBlockModel, _id: 'block::2', blockId: 2 },
          { ...inputForBlockModel, _id: 'block::3', blockId: 3 },
          { ...inputForBlockModel, _id: 'block::4', blockId: 4 },
        ]);

        const blocksResponse = await request(app)
          .get('/blocks?limit=2&offset=1')
          .set('Authorization', `Bearer ${authHarness.accessToken}`);
        const blocks: IBlock[] = blocksResponse.body;

        expect(blocks).to.be.an('array').with.lengthOf(2);
        expect(blocks[0]).to.have.property('blockId', 3);
        expect(blocks[1]).to.have.property('blockId', 2);
      });
    });
  });

  describe('GET /blocks/:blockId', () => {
    describe('when no bearer token is provided', () => {
      it('responds with HTTP 401 Unauthorized', async () => {
        const response = await request(app).get('/blocks/1');

        expect(response.status).to.eq(401);
      });
    });

    describe('when an invalid bearer token is provided', () => {
      it('responds with HTTP 401 Unauthorized', async () => {
        const response = await request(app).get('/blocks/1').set('Authorization', 'Bearer wrgonBearer');

        expect(response.status).to.eq(401);
      });
    });

    describe('when a valid bearer token is provided', () => {
      describe('when an invalid block id is provided', () => {
        beforeEach(async () => {
          authHarness = await setupJWKSMock();
        });

        afterEach(async () => {
          await authHarness.jwksMock.stop();
          await Promise.all([Block.deleteMany({}), Leaf.deleteMany({})]);
        });

        it('returns with HTTP 404', async () => {
          await Block.create([
            { ...inputForBlockModel, _id: 'block::1', blockId: 1 },
            { ...inputForBlockModel, _id: 'block::2', blockId: 2 },
            { ...inputForBlockModel, _id: 'block::3', blockId: 3 },
            { ...inputForBlockModel, _id: 'block::4', blockId: 4 },
          ]);

          const blocksResponse = await request(app)
            .get('/blocks/999')
            .set('Authorization', `Bearer ${authHarness.accessToken}`);

          expect(blocksResponse.status).to.eq(404);
        });
      });

      describe('when a valid block id is provided', () => {
        beforeEach(async () => {
          authHarness = await setupJWKSMock();
        });

        afterEach(async () => {
          await authHarness.jwksMock.stop();
          await Promise.all([Block.deleteMany({}), Leaf.deleteMany({})]);
        });

        it('returns block by its id', async () => {
          await Block.create([
            { ...inputForBlockModel, _id: 'block::1', blockId: 1 },
            { ...inputForBlockModel, _id: 'block::2', blockId: 2 },
            { ...inputForBlockModel, _id: 'block::3', blockId: 3 },
            { ...inputForBlockModel, _id: 'block::4', blockId: 4 },
          ]);

          const blocksResponse = await request(app)
            .get('/blocks/1')
            .set('Authorization', `Bearer ${authHarness.accessToken}`);
          const blocks: Record<string, unknown> = blocksResponse.body;

          expect(blocks.data).to.have.property('_id', 'block::1');
        });
      });
    });
  });

  describe('GET /blocks/:blockId/leaves', () => {
    describe('when no bearer token is provided', () => {
      it('responds with HTTP 401 Unauthorized', async () => {
        const response = await request(app).get('/blocks/1/leaves');

        expect(response.status).to.eq(401);
      });
    });

    describe('when an invalid bearer token is provided', () => {
      it('responds with HTTP 401 Unauthorized', async () => {
        const response = await request(app).get('/blocks/1/leaves').set('Authorization', 'Bearer wrgonBearer');

        expect(response.status).to.eq(401);
      });
    });

    describe('when a valid bearer token is provided', () => {
      beforeEach(async () => {
        authHarness = await setupJWKSMock();
      });

      afterEach(async () => {
        await authHarness.jwksMock.stop();
        await Promise.all([Block.deleteMany({}), Leaf.deleteMany({})]);
      });

      it('returns leaves for a block', async () => {
        await Block.create([
          { ...inputForBlockModel, _id: 'block::1', blockId: 1 },
          { ...inputForBlockModel, _id: 'block::2', blockId: 2 },
          { ...inputForBlockModel, _id: 'block::3', blockId: 3 },
          { ...inputForBlockModel, _id: 'block::4', blockId: 4 },
        ]);

        await Leaf.create([
          { _id: 'leaf::block::1::a', blockId: 1, key: 'a', value: '0x0', proof: [] },
          { _id: 'leaf::block::1::b', blockId: 1, key: 'b', value: '0x0', proof: [] },
          { _id: 'leaf::block::2::a', blockId: 2, key: 'a', value: '0x0', proof: [] },
          { _id: 'leaf::block::2::b', blockId: 2, key: 'b', value: '0x0', proof: [] },
          { _id: 'leaf::block::3::a', blockId: 3, key: 'a', value: '0x0', proof: [] },
          { _id: 'leaf::block::4::a', blockId: 4, key: 'a', value: '0x0', proof: [] },
        ]);

        const leavesResponse = await request(app)
          .get('/blocks/1/leaves')
          .set('Authorization', `Bearer ${authHarness.accessToken}`);
        const leaves: Record<string, unknown>[] = leavesResponse.body;

        expect(leaves).to.be.an('array').with.lengthOf(2);
        leaves.forEach((leaf) => {
          expect(leaf).to.have.property('blockId', 1);
        });
      });
    });
  });
});
