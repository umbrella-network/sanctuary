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
import { setupJWKSMock, TestAuthHarness } from '../../helpers/authHelpers';
import { projectFactory } from '../../mocks/factories/projectFactory';
import { apiKeyFactory } from '../../mocks/factories/apiKeyFactory';

describe('deleteApiKey', () => {
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

  describe('DELETE /api-keys/:id', () => {
    describe('when no bearer token is provided', () => {
      it('responds with HTTP 401 Unauthorized', async () => {
        const response = await request(app).delete('/api-keys/API_KEY_ID');
        expect(response.status).to.eq(401);
      });
    });

    describe('when an invalid bearer token is provided', () => {
      it('responds with HTTP 401 Unauthorized', async () => {
        const response = await request(app).delete('/api-keys/API_KEY_ID').set('Authorization', 'Bearer wrongBearer');
        expect(response.status).to.eq(401);
      });
    });

    describe('when a valid bearer token is provided', () => {
      let project: IProject;
      let apiKey: IApiKey;
      let response: request.Response;

      describe('when id provided is wrong', () => {
        before(async () => {
          project = await Project.create({ ...projectFactory.build(), ownerId: 'USER_ID', ownerType: 'User' });
          apiKey = await ApiKey.create({ ...apiKeyFactory.build(), projectId: project.id });
          authHarness = await setupJWKSMock();
          response = await request(app)
            .delete('/api-keys/wrongId')
            .set('Authorization', `Bearer ${authHarness.accessToken}`);
        });

        after(async () => {
          await authHarness.jwksMock.stop();
          await ApiKey.deleteMany();
          await Project.deleteMany();
        });

        it('responds with HTTP 404', async () => {
          expect(response.status).to.eq(404);
        });
      });

      describe('when project is from different owner', () => {
        before(async () => {
          project = await Project.create({
            ...projectFactory.build(),
            ownerId: 'DIFFERENT_USER_ID',
            ownerType: 'User',
          });
          apiKey = await ApiKey.create({ ...apiKeyFactory.build(), projectId: project.id });
          authHarness = await setupJWKSMock();
          response = await request(app)
            .delete(`/api-keys/${apiKey.id}`)
            .set('Authorization', `Bearer ${authHarness.accessToken}`);
        });

        after(async () => {
          await authHarness.jwksMock.stop();
          await ApiKey.deleteMany();
          await Project.deleteMany();
        });

        it('responds with HTTP 403', async () => {
          expect(response.status).to.eq(403);
        });

        it('count number of apiKey equals 1', async () => {
          const apiKeyCount = await ApiKey.countDocuments();
          expect(apiKeyCount).to.eq(1);
        });
      });

      describe('when id is provided', () => {
        before(async () => {
          project = await Project.create({ ...projectFactory.build(), ownerId: 'USER_ID', ownerType: 'User' });
          apiKey = await ApiKey.create({ ...apiKeyFactory.build(), projectId: project.id });
          authHarness = await setupJWKSMock();
          response = await request(app)
            .delete(`/api-keys/${apiKey.id}`)
            .set('Authorization', `Bearer ${authHarness.accessToken}`);
        });

        after(async () => {
          await authHarness.jwksMock.stop();
          await ApiKey.deleteMany();
          await Project.deleteMany();
        });

        it('responds with HTTP 200', async () => {
          expect(response.status).to.eq(200);
        });

        it('count number of apiKey equals 0', async () => {
          const apiKeyCount = await ApiKey.countDocuments();
          expect(apiKeyCount).to.eq(0);
        });
      });
    });
  });
});
