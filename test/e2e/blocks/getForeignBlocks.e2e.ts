import 'reflect-metadata';
import { expect } from 'chai';
import request from 'supertest';
import { Container } from 'inversify';
import { Application } from 'express';

import Server from '../../../src/lib/Server';
import { createBlockFromForeignBlock, foreignBlockFactory } from '../../mocks/factories/foreignBlockFactory';
import ForeignBlock, { IForeignBlock } from '../../../src/models/ForeignBlock';
import Block, { IBlock } from '../../../src/models/Block';
import { blockFactory } from '../../mocks/factories/blockFactory';
import { setupDatabase, teardownDatabase } from '../../helpers/databaseHelpers';
import { getContainer } from '../../../src/lib/getContainer';
import { loadTestEnv } from '../../helpers';
import { setupApiKey, teardownTestUser } from '../../helpers/authHelpers';
import { IApiKey } from '../../../src/models/ApiKey';

const createBlocks = async (numberOfBlocks = 3): Promise<void> => {
  for (let i = 0; i < numberOfBlocks; i++) {
    await createBlockFromForeignBlock();
  }
};

describe('getForeignBlocks', () => {
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
      let subject: IForeignBlock[];
      let apiKey: IApiKey;

      const chainId = 'ethereum';

      before(async () => {
        apiKey = await setupApiKey();
        await createBlocks();

        response = await request(app).get(`/blocks?chainId=${chainId}`).set('Authorization', `${apiKey.key}`);
        subject = response.body;
      });

      after(async () => {
        await Promise.all([Block.deleteMany(), ForeignBlock.deleteMany(), teardownTestUser()]);
      });

      it('responds with HTTP 200', async () => {
        expect(response.status).to.eq(200);
      });

      it('returns an array with 3 foreign blocks', async () => {
        expect(subject).to.be.an('array').with.length(3);
      });

      it('returns foreign blocks', async () => {
        const foreignBlocks = await ForeignBlock.find({ foreignChainId: chainId });

        for (const block of subject) {
          const match = foreignBlocks.find((e) => {
            return e.blockId == block.blockId;
          });

          expect(match).to.have.property('foreignChainId', chainId);
        }
      });
    });
  });

  describe('GET /blocks:blockId?chainId', () => {
    let foreignBlock: IForeignBlock;
    let block: IBlock;
    let subject: IForeignBlock;

    before(async () => {
      foreignBlock = new ForeignBlock(foreignBlockFactory.build());
      await foreignBlock.save();

      block = new Block(blockFactory.build({ blockId: foreignBlock.blockId }));
      await block.save();
    });

    after(async () => {
      await Block.deleteMany();
      await ForeignBlock.deleteMany({});
    });

    describe('when no API Key is provided', () => {
      it('responds with HTTP 200', async () => {
        const response = await request(app).get(
          `/blocks/${foreignBlock.blockId}?chainId=${foreignBlock.foreignChainId}`
        );

        expect(response.status).to.eq(200);
      });
    });

    describe('when an invalid API Key is provided', () => {
      it('responds with HTTP 401', async () => {
        const response = await request(app)
          .get(`/blocks/${foreignBlock.blockId}?chainId=${foreignBlock.foreignChainId}`)
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
            .get(`/blocks/${foreignBlock.blockId}?chainId=wrongChainId`)
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
            .get(`/blocks/${foreignBlock.blockId}?chainId=${foreignBlock.foreignChainId}`)
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

        it('returns the correct foreignBlock anchor', async () => {
          expect(subject.anchor).to.eq(foreignBlock.anchor);
        });
      });
    });
  });
});
