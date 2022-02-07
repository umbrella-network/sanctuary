import 'reflect-metadata';
import { expect } from 'chai';
import Server from '../../../src/lib/Server';
import { Container } from 'inversify';
import { getContainer } from '../../../src/lib/getContainer';
import { loadTestEnv } from '../../helpers';
import request from 'supertest';
import { Application } from 'express';
import { after } from 'mocha';
import nock from 'nock';
import settings from '../../../src/config/settings';
import { setupDatabase, teardownDatabase } from '../../helpers/databaseHelpers';

describe('/metrics', async () => {
  let container: Container;
  let app: Application;

  before(async () => {
    loadTestEnv();
    await setupDatabase();
    settings.api.restrict.apiKey = 'testToken';
    container = getContainer();
    container.rebind('Settings').toConstantValue(settings);
    app = container.get(Server).app;
  });

  after(async () => {
    await teardownDatabase();
    nock.restore();
  });

  afterEach(() => {
    nock.cleanAll();
  });
  describe('/metrics/voters', async () => {
    describe('GET /metrics/voters', async () => {
      describe('when an invalid bearer token is provided', async () => {
        it('responds with HTTP 401 Unauthorized when no bearer token is given', async () => {
          const res = await request(app).get('/metrics/voters');
          expect(res.status).to.eq(401);
        });
        it('responds with HTTP 401 Unauthorized when no bearer token is wrong', async () => {
          const res = await request(app).get('/metrics/voters').set('Authorization', 'Bearer 123');
          expect(res.status).to.eq(401);
        });
      });

      describe('when a valid bearer token is provided', async () => {
        const accessToken = 'testToken';

        describe('when a valid query param is provided', () => {
          it('responds with status 200', async () => {
            const res = await request(app)
              .get('/metrics/voters?startDate=2021-12-01&endDate=2022-01-01')
              .set('Authorization', `Bearer ${accessToken}`);

            expect(res.status).to.eq(200);
          });
        });

        describe('when an invalid query param is provided', () => {
          it('responds with status 400 when missing startDate and endDate', async () => {
            const res = await request(app).get('/metrics/voters').set('Authorization', `Bearer ${accessToken}`);

            expect(res.status).to.eq(400);
          });
          it('responds with status 400 when missing startDate', async () => {
            const res = await request(app)
              .get('/metrics/voters?endDate=2022-01-01')
              .set('Authorization', `Bearer ${accessToken}`);

            expect(res.status).to.eq(400);
          });
          it('responds with status 400 when missing endDate', async () => {
            const res = await request(app)
              .get('/metrics/voters?startDate=2022-12-01')
              .set('Authorization', `Bearer ${accessToken}`);

            expect(res.status).to.eq(400);
          });
          it('responds with status 400 when invalid date is provided', async () => {
            const res = await request(app)
              .get('/metrics/voters?startDate=Invalid')
              .set('Authorization', `Bearer ${accessToken}`);

            expect(res.status).to.eq(400);
          });
        });
      });
    });
  });
});
