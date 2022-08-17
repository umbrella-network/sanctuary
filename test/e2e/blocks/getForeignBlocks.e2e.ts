import 'reflect-metadata';
import { expect } from 'chai';
import request from 'supertest';
import { Container } from 'inversify';
import { Application } from 'express';

import Server from '../../../src/lib/Server';
import { createBlockFromBlockChainData, blockChainDataFactory } from '../../mocks/factories/blockChainDataFactory';
import BlockChainData, { IBlockChainData } from '../../../src/models/BlockChainData';
import Block, { IBlock } from '../../../src/models/Block';
import { blockFactory } from '../../mocks/factories/blockFactory';
import { setupDatabase, teardownDatabase } from '../../helpers/databaseHelpers';
import { getContainer } from '../../../src/lib/getContainer';
import { loadTestEnv } from '../../helpers';
import { setupApiKey, teardownTestUser } from '../../helpers/authHelpers';
import { IApiKey } from '../../../src/models/ApiKey';

const createBlocks = async (numberOfBlocks = 3): Promise<void> => {
  for (let i = 0; i < numberOfBlocks; i++) {
    await createBlockFromBlockChainData();
  }
};

describe('getBlockChainDatas', () => {
  let container: Container;
  let app: Application;
  let response: request.Response;

  before(async () => {
    loadTestEnv();
    await setupDatabase();

    container = getContainer();
    app = container.get(Server).app;
  });

  after(async () => {
    await teardownDatabase();
  });

  describe('GET /blocks:chainId', () => {
    describe('when no API Key is provided', () => {
      it('responds with HTTP 200', async () => {
        const response = await request(app).get('/blocks?chainId=ethereum');

        expect(response.status).to.eq(200);
      });
    });

    describe('when an invalid API Key is provided', () => {
      it('responds with HTTP 401', async () => {
        const response = await request(app).get('/blocks?chainId=ethereum').set('Authorization', 'wrongAPIKey');

        expect(response.status).to.eq(401);
      });
    });

    describe('when a valid API Key is provided', () => {
      let subject: IBlockChainData[];
      let apiKey: IApiKey;

      const chainId = 'ethereum';

      before(async () => {
        apiKey = await setupApiKey();
        await createBlocks();

        response = await request(app).get(`/blocks?chainId=${chainId}`).set('Authorization', `${apiKey.key}`);
        subject = response.body;
      });

      after(async () => {
        await Promise.all([Block.deleteMany(), BlockChainData.deleteMany(), teardownTestUser()]);
      });

      it('responds with HTTP 200', async () => {
        expect(response.status).to.eq(200);
      });

      it('returns an array with 3 foreign blocks', async () => {
        expect(subject).to.be.an('array').with.length(3);
      });

      it('returns foreign blocks', async () => {
        const blockChainDatas = await BlockChainData.find({ chainId });

        for (const block of subject) {
          const match = blockChainDatas.find((e) => {
            return e.blockId == block.blockId;
          });

          expect(match).to.have.property('chainId', chainId);
        }
      });
    });
  });

  describe('GET /blocks:blockId?chainId', () => {
    let blockChainData: IBlockChainData;
    let block: IBlock;
    let subject: IBlockChainData;

    before(async () => {
      blockChainData = new BlockChainData(blockChainDataFactory.build());
      await blockChainData.save();

      block = new Block(blockFactory.build({ blockId: blockChainData.blockId }));
      await block.save();
    });

    after(async () => {
      await Block.deleteMany();
      await BlockChainData.deleteMany({});
    });

    describe('when no API Key is provided', () => {
      it('responds with HTTP 200', async () => {
        const response = await request(app).get(`/blocks/${blockChainData.blockId}?chainId=${blockChainData.chainId}`);

        expect(response.status).to.eq(200);
      });
    });

    describe('when an invalid API Key is provided', () => {
      it('responds with HTTP 401', async () => {
        const response = await request(app)
          .get(`/blocks/${blockChainData.blockId}?chainId=${blockChainData.chainId}`)
          .set('Authorization', 'wrongAPIKey');

        expect(response.status).to.eq(401);
      });
    });

    describe('when a valid API Key is provided', () => {
      describe('when a invalid chainId is provided', () => {
        let apiKey: IApiKey;

        before(async () => {
          apiKey = await setupApiKey();
          response = await request(app)
            .get(`/blocks/${blockChainData.blockId}?chainId=wrongChainId`)
            .set('Authorization', `${apiKey.key}`);
          subject = response.body.data;
        });

        after(async () => {
          await teardownTestUser();
        });

        it('responds with HTTP 404', async () => {
          expect(response.status).to.eq(404);
        });
      });

      describe('when a valid chainId is provided', () => {
        let apiKey: IApiKey;

        before(async () => {
          apiKey = await setupApiKey();
          response = await request(app)
            .get(`/blocks/${blockChainData.blockId}?chainId=${blockChainData.chainId}`)
            .set('Authorization', `${apiKey.key}`);
          subject = response.body.data;
        });

        after(async () => {
          await teardownTestUser();
        });

        it('responds with HTTP 200', async () => {
          expect(response.status).to.eq(200);
        });

        it('returns the correct block _id', async () => {
          expect(subject._id).to.eq(block._id);
        });

        it('returns the correct block blockId', async () => {
          expect(subject.blockId).to.eq(block.blockId);
        });

        it('returns the correct blockChainData anchor', async () => {
          expect(subject.anchor).to.eq(blockChainData.anchor);
        });
      });
    });
  });
});
