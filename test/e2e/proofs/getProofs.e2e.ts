import 'reflect-metadata';
import request from 'supertest';
import { BlockStatus } from '@umb-network/toolbox/dist/types/BlockStatuses';
import { expect } from 'chai';
import { Container } from 'inversify';
import { Application } from 'express';

import { loadTestEnv } from '../../helpers';
import Block, { IBlock } from '../../../src/models/Block';
import Leaf, { ILeaf } from '../../../src/models/Leaf';
import { inputForBlockModel } from '../../fixtures/inputForBlockModel';
import { setupDatabase, teardownDatabase } from '../../helpers/databaseHelpers';
import { setupJWKSMock, teardownTestUser, TestAuthHarness } from '../../helpers/authHelpers';
import ForeignBlock, { IForeignBlock } from '../../../src/models/ForeignBlock';
import { foreignBlockFactory } from '../../mocks/factories/foreignBlockFactory';
import { blockFactory } from '../../mocks/factories/blockFactory';
import { getContainer } from '../../../src/lib/getContainer';
import Server from '../../../src/lib/Server';

describe('getProofs', () => {
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
    await teardownTestUser();
    await teardownDatabase();
  });

  describe('GET /proofs', () => {
    describe('when an invalid bearer token is provided', () => {
      it('responds with HTTP 401 Unauthorized when no bearer token is given', async () => {
        const res = await request(app).get('/proofs');

        expect(res.status).to.eq(401);
      });

      it('responds with HTTP 401 Unauthorized when no bearer token is wrong', async () => {
        const res = await request(app).get('/proofs').set('Authorization', 'Bearer 123');

        expect(res.status).to.eq(401);
      });
    });

    describe('when a valid bearer token is provided', () => {
      beforeEach(async () => {
        authHarness = await setupJWKSMock();
      });

      afterEach(async () => {
        await authHarness.jwksMock.stop();
        await Promise.all([Block.deleteMany({}), Leaf.deleteMany({}), ForeignBlock.deleteMany({})]);
      });

      describe('when finalized block found', () => {
        it('returns valid response without leaves for the latest finalized block', async () => {
          await Block.create([
            { ...inputForBlockModel, _id: 'block::1', blockId: 1, status: 'new' },
            { ...inputForBlockModel, _id: 'block::2', blockId: 2, status: 'finalized' },
            { ...inputForBlockModel, _id: 'block::3', blockId: 3, status: 'failed' },
            { ...inputForBlockModel, _id: 'block::4', blockId: 4, status: 'finalized' },
          ]);

          const proofsResponse = await request(app)
            .get('/proofs')
            .set('Authorization', `Bearer ${authHarness.accessToken}`);

          expect(proofsResponse.body.data.block).to.have.property('blockId', 4);
          expect(proofsResponse.body.data.block).to.have.property('status', 'finalized');
          expect(proofsResponse.body.data.keys).to.be.an('array').that.is.empty;
          expect(proofsResponse.body.data.leaves).to.be.an('array').that.is.empty;
        });
      });

      describe('when no finalized block found', () => {
        it('returns empty object', async () => {
          await Block.create([
            { ...inputForBlockModel, _id: 'block::1', blockId: 1, status: 'new' },
            { ...inputForBlockModel, _id: 'block::2', blockId: 2, status: 'failed' },
            { ...inputForBlockModel, _id: 'block::3', blockId: 3, status: 'failed' },
            { ...inputForBlockModel, _id: 'block::4', blockId: 4, status: 'failed' },
          ]);

          const proofsResponse = await request(app)
            .get('/proofs')
            .set('Authorization', `Bearer ${authHarness.accessToken}`);

          expect(proofsResponse.body.data).to.be.an('object').that.is.empty;
        });
      });
    });

    describe('GET /proofs?keys=<n>', () => {
      it('returns latest block with leaves matching specified keys', async () => {
        await Block.create([
          { ...inputForBlockModel, _id: 'block::1', blockId: 1 },
          { ...inputForBlockModel, _id: 'block::2', blockId: 2 },
          { ...inputForBlockModel, _id: 'block::3', blockId: 3 },
          { ...inputForBlockModel, _id: 'block::4', blockId: 4 },
        ]);

        await Leaf.create([
          { _id: 'leaf::block::1::a', blockId: 1, key: 'a', value: '0x0', proof: [] },
          { _id: 'leaf::block::2::a', blockId: 2, key: 'a', value: '0x0', proof: [] },
          { _id: 'leaf::block::3::a', blockId: 3, key: 'a', value: '0x0', proof: [] },
          { _id: 'leaf::block::4::a', blockId: 4, key: 'a', value: '0x0', proof: [] },
          { _id: 'leaf::block::4::b', blockId: 4, key: 'b', value: '0x0', proof: [] },
          { _id: 'leaf::block::4::c', blockId: 4, key: 'c', value: '0x0', proof: [] },
        ]);

        const proofsResponse = await request(app)
          .get('/proofs?keys=a&keys=b')
          .set('Authorization', `Bearer ${authHarness.accessToken}`);
        const leafWithKeyA = proofsResponse.body.data.leaves.find((leaf: ILeaf) => leaf.key === 'a');
        const leafWithKeyB = proofsResponse.body.data.leaves.find((leaf: ILeaf) => leaf.key === 'b');

        expect(proofsResponse.status).to.be.eq(200);
        expect(proofsResponse.body.data.block).to.have.property('blockId', 4);
        expect(proofsResponse.body.data.keys).to.be.an('array').deep.eq(['a', 'b']);
        expect(proofsResponse.body.data.leaves).to.be.an('array').with.lengthOf(2);

        expect(leafWithKeyA).to.be.an('object').that.has.property('key', 'a');
        expect(leafWithKeyA).to.be.an('object').that.has.property('blockId', 4);

        expect(leafWithKeyB).to.be.an('object').that.has.property('key', 'b');
        expect(leafWithKeyB).to.be.an('object').that.has.property('blockId', 4);
      });
    });

    describe('GET /proofs?chainId=<n>', () => {
      describe('when a foreign Chain ID is provided', () => {
        let foreignBlock: IForeignBlock;
        let block: IBlock;

        const operation = async (chainId: string) =>
          request(app).get(`/proofs?chainId=${chainId}`).set('Authorization', `Bearer ${authHarness.accessToken}`);

        beforeEach(async () => {
          foreignBlock = new ForeignBlock(foreignBlockFactory.build());
          block = new Block(
            blockFactory.build({
              status: BlockStatus.Finalized,
              blockId: foreignBlock.blockId,
            })
          );
          const nonFinalizedBlock = new Block(blockFactory.build({ blockId: 1000, status: BlockStatus.New }));

          await foreignBlock.save();
          await block.save();
          await nonFinalizedBlock.save();
        });

        afterEach(async () => {
          await Promise.all([Block.deleteMany({}), Leaf.deleteMany({}), ForeignBlock.deleteMany({})]);
        });

        it('returns the latest finalized block', async () => {
          const response = await operation('ethereum');
          const subject = response.body.data.block;

          expect(subject._id).to.eq(block._id);
          expect(subject.blockId).to.eq(block.blockId);
        });
      });
    });
  });
});
