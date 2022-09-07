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
import { setupApiKey, teardownTestUser } from '../../helpers/authHelpers';
import BlockChainData, { IBlockChainData } from '../../../src/models/BlockChainData';
import { blockChainDataFactory } from '../../mocks/factories/blockChainDataFactory';
import { blockAndLeafFactory, blockFactory } from '../../mocks/factories/blockFactory';
import { getContainer } from '../../../src/lib/getContainer';
import Server from '../../../src/lib/Server';
import { IApiKey } from '../../../src/models/ApiKey';

describe('getProofs', () => {
  let container: Container;
  let app: Application;

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
    afterEach(async () => {
      await Promise.all([
        Block.deleteMany(),
        BlockChainData.deleteMany(),
        Leaf.deleteMany(),
        BlockChainData.deleteMany(),
      ]);
    });

    describe('when finalized block found', () => {
      it('returns valid response without leaves for the latest finalized block', async () => {
        await Block.create([
          { ...inputForBlockModel, _id: 'block::1', blockId: 1, status: 'new' },
          { ...inputForBlockModel, _id: 'block::2', blockId: 2, status: 'finalized' },
          { ...inputForBlockModel, _id: 'block::3', blockId: 3, status: 'failed' },
          { ...inputForBlockModel, _id: 'block::4', blockId: 4, status: 'finalized' },
        ]);

        await BlockChainData.create([
          blockChainDataFactory.build({ blockId: 1, chainId: 'bsc', status: 'new' }),
          blockChainDataFactory.build({ blockId: 2, chainId: 'bsc', status: 'finalized' }),
          blockChainDataFactory.build({ blockId: 3, chainId: 'bsc', status: 'failed' }),
          blockChainDataFactory.build({ blockId: 4, chainId: 'bsc', status: 'finalized' }),
        ]);

        const proofsResponse = await request(app).get('/proofs');

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

        await BlockChainData.create([
          blockChainDataFactory.build({ blockId: 1, chainId: 'bsc', status: 'new' }),
          blockChainDataFactory.build({ blockId: 2, chainId: 'bsc', status: 'failed' }),
          blockChainDataFactory.build({ blockId: 3, chainId: 'bsc', status: 'failed' }),
          blockChainDataFactory.build({ blockId: 4, chainId: 'bsc', status: 'failed' }),
        ]);

        const proofsResponse = await request(app).get('/proofs');

        console.log(proofsResponse.body);

        expect(proofsResponse.body.data).to.be.an('object').that.is.empty;
      });
    });
  });

  describe('GET /proofs?keys=<n>', () => {
    describe('when an invalid API Key is provided', () => {
      beforeEach(async () => {
        await blockAndLeafFactory();
      });

      afterEach(async () => {
        await Promise.all([Block.deleteMany(), BlockChainData.deleteMany(), Leaf.deleteMany()]);
      });

      it('responds with HTTP 401', async () => {
        const response = await request(app).get('/proofs?keys=a&keys=b').set('Authorization', 'Bearer wrongAPI');

        expect(response.status).to.eq(401);
      });
    });

    describe('when no API Key is provided', () => {
      beforeEach(async () => {
        await blockAndLeafFactory();
      });

      afterEach(async () => {
        await Promise.all([Block.deleteMany(), BlockChainData.deleteMany(), Leaf.deleteMany()]);
      });

      it('returns latest block with leaves matching specified keys', async () => {
        const proofsResponse = await request(app).get('/proofs?keys=a&keys=b');
        const leafWithKeyA = proofsResponse.body.data.leaves.find((leaf: ILeaf) => leaf.key === 'a');
        const leafWithKeyB = proofsResponse.body.data.leaves.find((leaf: ILeaf) => leaf.key === 'b');

        expect(proofsResponse.status).to.be.eq(200);
        expect(proofsResponse.body.data.block).to.have.property('blockId', 4);
        expect(proofsResponse.body.data.keys).to.eql(['a', 'b']);
        expect(proofsResponse.body.data.leaves).to.be.an('array').with.lengthOf(2);
        proofsResponse.body.data.leaves.forEach((leaf: ILeaf) => {
          expect(leaf).to.have.property('blockId', 4);
          expect(leaf.proof).to.eql([]);
        });

        expect(leafWithKeyA).to.be.an('object').that.has.property('key', 'a');
        expect(leafWithKeyA).to.be.an('object').that.has.property('blockId', 4);

        expect(leafWithKeyB).to.be.an('object').that.has.property('key', 'b');
        expect(leafWithKeyB).to.be.an('object').that.has.property('blockId', 4);
      });
    });

    describe('when a valid API Key is provided', () => {
      let apiKey: IApiKey;

      beforeEach(async () => {
        await blockAndLeafFactory();
        apiKey = await setupApiKey();
      });

      afterEach(async () => {
        await Promise.all([Block.deleteMany(), BlockChainData.deleteMany(), Leaf.deleteMany()]);
      });

      it('returns latest block with leaves matching specified keys', async () => {
        const proofsResponse = await request(app).get('/proofs?keys=a&keys=b').set('Authorization', `${apiKey.key}`);
        const leafWithKeyA = proofsResponse.body.data.leaves.find((leaf: ILeaf) => leaf.key === 'a');
        const leafWithKeyB = proofsResponse.body.data.leaves.find((leaf: ILeaf) => leaf.key === 'b');

        expect(proofsResponse.status).to.be.eq(200);
        expect(proofsResponse.body.data.block).to.have.property('blockId', 4);
        expect(proofsResponse.body.data.keys).to.eql(['a', 'b']);
        expect(proofsResponse.body.data.leaves).to.be.an('array').with.lengthOf(2);
        proofsResponse.body.data.leaves.forEach((leaf: ILeaf, index: number) => {
          expect(leaf).to.have.property('blockId', 4);
          expect(leaf.proof).to.eql([`proof${index + 6}`]);
        });

        expect(leafWithKeyA).to.be.an('object').that.has.property('key', 'a');
        expect(leafWithKeyA).to.be.an('object').that.has.property('blockId', 4);

        expect(leafWithKeyB).to.be.an('object').that.has.property('key', 'b');
        expect(leafWithKeyB).to.be.an('object').that.has.property('blockId', 4);
      });
    });
  });

  describe('GET /proofs?chainId=<n>', () => {
    describe('when a foreign Chain ID is provided', () => {
      let blockChainData: IBlockChainData;
      let block: IBlock;

      const operation = async (chainId: string) => request(app).get(`/proofs?chainId=${chainId}`);

      beforeEach(async () => {
        blockChainData = new BlockChainData(blockChainDataFactory.build({ status: BlockStatus.Finalized }));

        block = new Block(
          blockFactory.build({
            status: BlockStatus.Finalized,
            blockId: blockChainData.blockId,
          })
        );
        const nonFinalizedBlock = new Block(blockFactory.build({ blockId: 1000, status: BlockStatus.New }));

        await blockChainData.save();
        await block.save();
        await nonFinalizedBlock.save();
      });

      afterEach(async () => {
        await Promise.all([
          Block.deleteMany(),
          BlockChainData.deleteMany(),
          Leaf.deleteMany(),
          BlockChainData.deleteMany(),
        ]);
      });

      it('returns the latest finalized block', async () => {
        const response = await operation('ethereum');
        const subject = response.body.data.block;

        expect(subject._id).to.eq(blockChainData._id);
        expect(subject.blockId).to.eq(block.blockId);
      });
    });
  });
});
