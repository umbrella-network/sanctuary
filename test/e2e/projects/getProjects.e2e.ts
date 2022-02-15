import 'reflect-metadata';
import { Container } from 'inversify';
import { expect } from 'chai';
import request from 'supertest';
import { Application } from 'express';

import { setupDatabase, teardownDatabase } from '../../helpers/databaseHelpers';
import { setupJWKSMock, teardownTestUser, TestAuthHarness } from '../../helpers/authHelpers';
import { getContainer } from '../../../src/lib/getContainer';
import Server from '../../../src/lib/Server';

describe('getProjects', () => {
  let authHarness: TestAuthHarness;
  let container: Container;
  let app: Application;

  before(async () => {
    await setupDatabase();

    container = getContainer();
    app = container.get(Server).app;
  });

  after(async () => {
    await teardownTestUser();
    await teardownDatabase();
  });

  describe('GET /projects', () => {
    describe('when no bearer token is provided', () => {
      it('responds with HTTP 401 Unauthorized', async () => {
        const response = await request(app).get('/projects');

        expect(response.status).to.eq(401);
      });
    });

    describe('when an invalid bearer token is provided', () => {
      it('responds with HTTP 401 Unauthorized', async () => {
        const response = await request(app).get('/projects').set('Authorization', 'Bearer wrgonBearer');

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

      it('returns projects', async () => {
        await request(app)
          .post('/projects')
          .send({
            name: 'Project name',
          })
          .set('Authorization', `Bearer ${authHarness.accessToken}`);

        const response = await request(app).get('/projects').set('Authorization', `Bearer ${authHarness.accessToken}`);
        const [project] = response.body.projects;

        expect(response.status).to.be.eq(200);
        expect(response.body).to.have.property('projects').that.is.an('array').with.lengthOf(1);
        expect(project).to.have.property('name', 'Project name');
      });
    });
  });
});
