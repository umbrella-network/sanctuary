import 'reflect-metadata';
import { Container } from 'inversify';
import { Application } from 'express';
import { loadTestEnv } from '../../helpers';
import { setupDatabase, teardownDatabase } from '../../helpers/databaseHelpers';
import { getContainer } from '../../../src/lib/getContainer';
import Server from '../../../src/lib/Server';
import { after } from 'mocha';
import request from 'supertest';
import { expect } from 'chai';
import Project, { IProject } from '../../../src/models/Project';
import ApiKey, { IApiKey } from '../../../src/models/ApiKey';
import { setupAuthHarness, TestAuthHarness } from '../../helpers/authHelpers';
import { projectFactory } from '../../mocks/factories/projectFactory';
import { apiKeyFactory } from '../../mocks/factories/apiKeyFactory';

describe('/api-keys', async () => {
  let container: Container;
  let app: Application;

  before(async () => {
    loadTestEnv();
    await setupDatabase();
    await Project.deleteMany({});
    await ApiKey.deleteMany({});
    container = getContainer();
    app = container.get(Server).app;
  });

  after(async () => {
    await Project.deleteMany({});
    await ApiKey.deleteMany({});
    await teardownDatabase();
  });

  describe('PUT /api-keys', async () => {
    describe('when the user is not authenticated', async () => {
      it('responds with HTTP 401 Unauthorized', async () => {
        const res = await request(app).put('/api-keys/SOME_KEY');
        expect(res.status).to.eq(401);
      });
    });

    describe('when the user is authenticated', async () => {
      let project: IProject;
      let apiKey: IApiKey;
      let authHarness: TestAuthHarness;

      beforeEach(async () => {
        authHarness = await setupAuthHarness();
        project = await Project.create({ ...projectFactory.build(), ownerId: 'USER_ID', ownerType: 'User' });
        apiKey = await ApiKey.create({ ...apiKeyFactory.build(), projectId: project.id });
      });

      afterEach(async () => {
        await authHarness.jwksMock.stop();
      });

      it('updates the API Key', async () => {
        const res = await request(app)
          .patch(`/api-keys/${apiKey.id}`)
          .set('Authorization', `Bearer ${authHarness.accessToken}`)
          .send({ description: 'A New Description' });

        expect(res.status).to.eq(200);
        expect(res.body.description).to.eq('A New Description');
      });
    });
  });
});
