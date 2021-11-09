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
import ApiKey from '../../../src/models/ApiKey';
import { setupAuthHarness, TestAuthHarness } from '../../helpers/authHelpers';
import { projectFactory } from '../../mocks/factories/projectFactory';

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

  describe('POST /api-keys', async () => {
    describe('when the user is not authenticated', async () => {
      it('responds with HTTP 401 Unauthorized', async () => {
        const res = await request(app).post('/api-keys');
        expect(res.status).to.eq(401);
      });
    });

    describe('when the user is authenticated', async () => {
      let project: IProject;
      let authHarness: TestAuthHarness;

      beforeEach(async () => {
        authHarness = await setupAuthHarness();
        project = await Project.create({ ...projectFactory.build(), ownerId: 'USER_ID', ownerType: 'User' });
      });

      afterEach(async () => {
        await authHarness.jwksMock.stop();
      });

      it('responds with a new API Key', async () => {
        const res = await request(app)
          .post('/api-keys')
          .set('Authorization', `Bearer ${authHarness.accessToken}`)
          .send({ projectId: project.id });

        expect(res.status).to.eq(201);
        expect(res.body).to.have.property('_id').that.is.a('string');
        expect(res.body).to.have.property('key').that.is.a('string');
        expect(res.body).to.have.property('projectId', project.id);
        expect(res.body).to.have.property('expiresAt').that.is.null;
      });
    });
  });
});
