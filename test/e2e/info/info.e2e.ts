import 'reflect-metadata';
import request, { Response } from 'supertest';
import { Application } from 'express';
import { expect } from 'chai';

import Server from '../../../src/lib/Server';
import { Container } from 'inversify';
import { getContainer } from '../../../src/lib/getContainer';
import { loadTestEnv } from '../../helpers';
import { setupDatabase, teardownDatabase } from '../../helpers/databaseHelpers';

describe('info', () => {
  let container: Container;
  let app: Application;
  let response: Response;

  before(async () => {
    loadTestEnv();
    await setupDatabase();

    container = getContainer();
    app = container.get(Server).app;
  });

  after(async () => {
    await teardownDatabase();
  });

  describe('GET /info', () => {
    describe('when none chainId is given', () => {
      before(async () => {
        response = await request(app).get('/info');
      });

      it('responds with HTTP 200', async () => {
        expect(response.status).to.eq(200);
      });

      it('responds with status not empty', async () => {
        expect(response.body.status).to.not.be.empty;
      });

      it('responds with expected BSC network', async () => {
        expect(response.body.network.name).to.eqls('bnbt');
        expect(response.body.network.id).to.eqls(97);
        expect(parseInt(response.body.network.blockNumber, 10)).gt(0);
      });
    });

    describe('when a valid chainId is given', () => {
      describe('when chainId is bsc', () => {
        before(async () => {
          response = await request(app).get('/info?chainId=bsc');
        });

        it('responds with HTTP 200', async () => {
          expect(response.status).to.eq(200);
        });

        it('responds with status not empty', async () => {
          expect(response.body.status).to.not.be.empty;
        });

        it('responds with expected BSC network', async () => {
          expect(response.body.network.name).to.eqls('bnbt');
          expect(response.body.network.id).to.eqls(97);
          expect(parseInt(response.body.network.blockNumber, 10)).gt(0);
        });
      });

      describe('when chainId is ethereum', () => {
        before(async () => {
          response = await request(app).get('/info?chainId=ethereum');
        });

        it('responds with HTTP 200', async () => {
          expect(response.status).to.eq(200);
        });

        it('responds with status not empty', async () => {
          expect(response.body.status).to.not.be.empty;
        });

        it('responds with expected ETH network', async () => {
          expect(['kovan', 'goerli'].includes(response.body.network.name)).true;
          expect([42, 5].includes(response.body.network.id)).true;
          expect(parseInt(response.body.network.blockNumber, 10)).gt(0);
        });
      });

      describe('when chainId is avalanche', () => {
        before(async () => {
          response = await request(app).get('/info?chainId=avax');
        });

        it('responds with HTTP 200', async () => {
          expect(response.status).to.eq(200);
        });

        it('responds with status not empty', async () => {
          expect(response.body.status).to.not.be.empty;
        });

        it('responds with expected AVAX network', async () => {
          expect(response.body.network.name).to.eqls('unknown');
          expect(response.body.network.id).to.eqls(43113);
          expect(parseInt(response.body.network.blockNumber, 10)).gt(0);
        });
      });

      describe('when chainId is solana', () => {
        before(async () => {
          response = await request(app).get('/info?chainId=solana');
        });

        it('responds with HTTP 200', async () => {
          expect(response.status).to.eq(200);
        });

        it('responds with status not empty', async () => {
          expect(response.body.status).to.not.be.empty;
        });

        it('responds with expected solana network', async () => {
          expect(response.body.network.name).to.eqls('solana-devnet');
          expect(response.body.network.id).to.eqls(0);
          expect(parseInt(response.body.network.blockNumber, 10)).gt(0);
        });
      });
    });
  });
});
