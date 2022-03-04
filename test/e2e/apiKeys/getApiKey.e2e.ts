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
import ApiKey, { IApiKey } from '../../../src/models/ApiKey';
import { setupJWKSMock, teardownTestUser, TestAuthHarness } from '../../helpers/authHelpers';
import { projectFactory } from '../../mocks/factories/projectFactory';
import { apiKeyFactory } from '../../mocks/factories/apiKeyFactory';

describe('getApiKey', () => {
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

  describe('GET /api-keys', () => {
    describe('when no bearer token is provided', () => {
      it('responds with HTTP 401 Unauthorized', async () => {
        const response = await request(app).get('/api-keys');

        expect(response.status).to.eq(401);
      });
    });

    describe('when an invalid bearer token is provided', () => {
      it('responds with HTTP 401 Unauthorized', async () => {
        const response = await request(app).get('/api-keys').set('Authorization', 'Bearer wrongBearer');

        expect(response.status).to.eq(401);
      });
    });

    describe('when a valid bearer token is provided', () => {
      let project: IProject;
      let apiKey: IApiKey;
      let response: request.Response;

      before(async () => {
        project = await Project.create({ ...projectFactory.build(), ownerId: 'USER_ID', ownerType: 'User' });
        apiKey = await ApiKey.create({ ...apiKeyFactory.build(), projectId: project.id });
        authHarness = await setupJWKSMock();
        response = await request(app).get('/api-keys').set('Authorization', `Bearer ${authHarness.accessToken}`);
      });

      after(async () => {
        await authHarness.jwksMock.stop();
      });

      it('responds with HTTP 200', async () => {
        expect(response.status).to.eq(200);
      });

      it('responds with 1 apiKey', async () => {
        expect(response.body.length).to.eq(1);
      });

      it('responds with correct apiKey _id', async () => {
        expect(response.body[0]._id).to.eq(apiKey._id);
      });

      it('responds with correct apiKey projectId', async () => {
        expect(response.body[0].projectId).to.eq(apiKey.projectId);
      });

      it('responds with correct apiKey key', async () => {
        expect(response.body[0].key).to.eq(apiKey.key);
      });
    });
  });
});
