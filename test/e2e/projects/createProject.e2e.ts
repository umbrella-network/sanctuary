import 'reflect-metadata';
import { Container } from 'inversify';
import { expect } from 'chai';
import request from 'supertest';
import { Application } from 'express';
import nock from 'nock';

import { setupDatabase, teardownDatabase } from '../../helpers/databaseHelpers';
import { setupJWKSMock, teardownTestUser, TestAuthHarness } from '../../helpers/authHelpers';
import { getContainer } from '../../../src/lib/getContainer';
import Server from '../../../src/lib/Server';
import { loadTestEnv } from '../../helpers';

describe('createProjects', () => {
  let authHarness: TestAuthHarness;
  let container: Container;
  let app: Application;

  before(async () => {
    nock.activate();
    loadTestEnv();
    await setupDatabase();

    container = getContainer();
    app = container.get(Server).app;
  });

  after(async () => {
    await teardownTestUser();
    await teardownDatabase();
  });

  describe('POST /projects', () => {
    describe('when no bearer token is provided', () => {
      it('responds with HTTP 401 Unauthorized', async () => {
        const response = await request(app).post('/projects');

        expect(response.status).to.eq(401);
      });
    });

    describe('when an invalid bearer token is provided', () => {
      it('responds with HTTP 401 Unauthorized', async () => {
        const response = await request(app).post('/projects').set('Authorization', 'Bearer wrongBearer');

        expect(response.status).to.eq(401);
      });
    });

    describe('when a valid bearer token is provided', () => {
      beforeEach(async () => {
        authHarness = await setupJWKSMock();
      });

      afterEach(async () => {
        await authHarness.jwksMock.stop();
      });

      describe('when no project name is provided', () => {
        it('responds with 400', async () => {
          const response = await request(app)
            .post('/projects')
            .send({
              name: '',
            })
            .set('Authorization', `Bearer ${authHarness.accessToken}`);

          expect(response.status).to.be.eq(400);
        });
      });

      describe('when project name is provided and input is valid', () => {
        it('creates project', async () => {
          const response = await request(app)
            .post('/projects')
            .send({
              name: 'Project name',
            })
            .set('Authorization', `Bearer ${authHarness.accessToken}`);

          expect(response.status).to.be.eq(201);
          expect(response.body).to.have.property('name', 'Project name');
        });
      });
    });
  });
});
