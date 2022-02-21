import 'reflect-metadata';
import { Container } from 'inversify';
import { Application } from 'express';
import request from 'supertest';
import { expect } from 'chai';

import { loadTestEnv } from '../../helpers';
import { setupDatabase, teardownDatabase } from '../../helpers/databaseHelpers';
import { getContainer } from '../../../src/lib/getContainer';
import Server from '../../../src/lib/Server';
import Project, { IProject } from '../../../src/models/Project';
import { setupJWKSMock, TestAuthHarness } from '../../helpers/authHelpers';
import { projectFactory } from '../../mocks/factories/projectFactory';
import ApiKey from '../../../src/models/ApiKey';

describe('createApiKey', () => {
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

  describe('POST /api-keys', () => {
    describe('when no bearer token is provided', () => {
      it('responds with HTTP 401 Unauthorized', async () => {
        const response = await request(app).post('/api-keys');
        expect(response.status).to.eq(401);
      });
    });

    describe('when an invalid bearer token is provided', () => {
      it('responds with HTTP 401 Unauthorized', async () => {
        const response = await request(app).post('/api-keys').set('Authorization', 'Bearer wrgonBearer');
        expect(response.status).to.eq(401);
      });
    });

    describe('when a valid bearer token is provided', () => {
      let project: IProject;
      let response: request.Response;

      describe('when no projectId is provided', () => {
        before(async () => {
          authHarness = await setupJWKSMock();
          project = await Project.create({ ...projectFactory.build(), ownerId: 'USER_ID', ownerType: 'User' });
          response = await request(app).post('/api-keys').set('Authorization', `Bearer ${authHarness.accessToken}`);
        });

        after(async () => {
          await authHarness.jwksMock.stop();
          await Project.deleteMany();
          await ApiKey.deleteMany();
        });

        it('responds with HTTP 400', () => {
          expect(response.status).to.eq(400);
        });

        it('count number of apiKey equals 0', async () => {
          const apiKeyCount = await ApiKey.countDocuments();
          expect(apiKeyCount).to.eq(0);
        });
      });

      describe('when projectId provided is wrong', () => {
        before(async () => {
          authHarness = await setupJWKSMock();
          project = await Project.create({ ...projectFactory.build(), ownerId: 'USER_ID', ownerType: 'User' });
          response = await request(app)
            .post('/api-keys')
            .set('Authorization', `Bearer ${authHarness.accessToken}`)
            .send({ projectId: 'wrongProjectId' });
        });

        after(async () => {
          await authHarness.jwksMock.stop();
          await Project.deleteMany();
          await ApiKey.deleteMany();
        });

        it('responds with HTTP 404', () => {
          expect(response.status).to.eq(404);
        });

        it('count number of apiKey equals 0', async () => {
          const apiKeyCount = await ApiKey.countDocuments();
          expect(apiKeyCount).to.eq(0);
        });
      });

      describe('when correct projectId is provided', () => {
        before(async () => {
          authHarness = await setupJWKSMock();
          project = await Project.create({ ...projectFactory.build(), ownerId: 'USER_ID', ownerType: 'User' });
          response = await request(app)
            .post('/api-keys')
            .set('Authorization', `Bearer ${authHarness.accessToken}`)
            .send({ projectId: project.id });
        });

        after(async () => {
          await authHarness.jwksMock.stop();
          await Project.deleteMany();
          await ApiKey.deleteMany();
        });

        it('responds with HTTP 201', () => {
          expect(response.status).to.eq(201);
        });

        it('count number of apiKey equals 1', async () => {
          const apiKeyCount = await ApiKey.countDocuments();
          expect(apiKeyCount).to.eq(1);
        });

        it('returns the _id as string', () => {
          expect(response.body).to.have.property('_id').that.is.a('string');
        });

        it('returns the key as string', () => {
          expect(response.body).to.have.property('key').that.is.a('string');
        });

        it('returns the correct project id', () => {
          expect(response.body).to.have.property('projectId', project.id);
        });

        it('returns the expiresAt as null', () => {
          expect(response.body).to.have.property('expiresAt').that.is.null;
        });
      });
    });
  });
});
