import 'reflect-metadata';
import { expect } from 'chai';
import Server from '../../../src/lib/Server';
import { Container } from 'inversify';
import { getContainer } from '../../../src/lib/getContainer';
import { loadTestEnv } from '../../helpers';
import request from 'supertest';
import { Application } from 'express';

import settings from '../../../src/config/settings';
import { setupDatabase, teardownDatabase } from '../../helpers/databaseHelpers';

describe('metrics', () => {
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
  });

  describe('/metrics/voters', () => {
    describe('GET /metrics/voters', () => {
      describe('when no bearer token is provided', () => {
        it('responds with HTTP 401 Unauthorized', async () => {
          const response = await request(app).get('/metrics/voters');

          expect(response.status).to.eq(401);
        });
      });

      describe('when an invalid bearer token is provided', () => {
        it('responds with HTTP 401 Unauthorized', async () => {
          const response = await request(app).get('/metrics/voters').set('Authorization', 'Bearer wrongBearer');

          expect(response.status).to.eq(401);
        });
      });

      describe('when a valid bearer token is provided', () => {
        const accessToken = 'testToken';

        describe('when a valid query param is provided', () => {
          // TODO create tests to assert the response
          it('responds with status 200', async () => {
            const res = await request(app)
              .get('/metrics/voters?startDate=2021-12-01&endDate=2022-01-01')
              .set('Authorization', `Bearer ${accessToken}`);

            expect(res.status).to.eq(200);
          });
        });

        describe('when an invalid query param is provided', () => {
          describe('when missing startDate and endDate', () => {
            it('responds with status 400', async () => {
              const res = await request(app).get('/metrics/voters').set('Authorization', `Bearer ${accessToken}`);

              expect(res.status).to.eq(400);
            });
          });
          describe('when missing startDate', () => {
            it('responds with status 400', async () => {
              const res = await request(app)
                .get('/metrics/voters?endDate=2022-01-01')
                .set('Authorization', `Bearer ${accessToken}`);

              expect(res.status).to.eq(400);
            });
          });
          describe('when missing endDate', () => {
            it('responds with status 400', async () => {
              const res = await request(app)
                .get('/metrics/voters?startDate=2022-12-01')
                .set('Authorization', `Bearer ${accessToken}`);

              expect(res.status).to.eq(400);
            });
          });
          describe('when invalid date is provided', () => {
            it('responds with status 400', async () => {
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
});
