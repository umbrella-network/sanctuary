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

describe('updateApiKey', () => {
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

  describe('PUT /api-keys/:id', () => {
    describe('when no bearer token is provided', () => {
      it('responds with HTTP 401 Unauthorized', async () => {
        const response = await request(app).put('/api-keys/SOME_KEY');

        expect(response.status).to.eq(401);
      });
    });

    describe('when an invalid bearer token is provided', () => {
      it('responds with HTTP 401 Unauthorized', async () => {
        const response = await request(app).put('/api-keys/SOME_KEY').set('Authorization', 'Bearer wrongBearer');

        expect(response.status).to.eq(401);
      });
    });

    describe('when a valid bearer token is provided', () => {
      let project: IProject;
      let apiKey: IApiKey;
      let response: request.Response;

      describe('when apiKey provided is wrong', () => {
        before(async () => {
          authHarness = await setupJWKSMock();
          project = await Project.create({ ...projectFactory.build(), ownerId: 'USER_ID', ownerType: 'User' });
          response = await request(app)
            .patch('/api-keys/wrongApiKey')
            .set('Authorization', `Bearer ${authHarness.accessToken}`)
            .send({ description: 'A New Description' });
        });

        after(async () => {
          await authHarness.jwksMock.stop();
          await Project.deleteMany();
          await ApiKey.deleteMany();
        });

        it('responds with HTTP 404', () => {
          expect(response.status).to.eq(404);
        });

        it('does not update the description', async () => {
          const createdDescription = await ApiKey.find({ description: 'A New Description' });
          expect(createdDescription).to.be.an('array').that.is.empty;
        });
      });

      describe('when projectId provided is wrong', () => {
        before(async () => {
          authHarness = await setupJWKSMock();
          project = await Project.create({
            ...projectFactory.build(),
            ownerId: 'DIFFERENT_USER_ID',
            ownerType: 'User',
          });
          apiKey = await ApiKey.create({ ...apiKeyFactory.build(), projectId: project.id });
          response = await request(app)
            .patch(`/api-keys/${apiKey.id}`)
            .set('Authorization', `Bearer ${authHarness.accessToken}`)
            .send({ description: 'A New Description' });
        });

        after(async () => {
          await authHarness.jwksMock.stop();
          await Project.deleteMany();
          await ApiKey.deleteMany();
        });

        it('responds with HTTP 403', () => {
          expect(response.status).to.eq(403);
        });

        it('does not update the description', async () => {
          const createdDescription = await ApiKey.find({ description: 'A New Description' });
          expect(createdDescription).to.be.an('array').that.is.empty;
        });
      });

      describe('when correct apiKey and correct projectId is provided', () => {
        before(async () => {
          authHarness = await setupJWKSMock();
          project = await Project.create({ ...projectFactory.build(), ownerId: 'USER_ID', ownerType: 'User' });
          apiKey = await ApiKey.create({ ...apiKeyFactory.build(), projectId: project.id });
          response = await request(app)
            .patch(`/api-keys/${apiKey.id}`)
            .set('Authorization', `Bearer ${authHarness.accessToken}`)
            .send({ description: 'A New Description' });
        });

        after(async () => {
          await authHarness.jwksMock.stop();
        });

        it('responds with HTTP 200', () => {
          expect(response.status).to.eq(200);
        });

        it('responds with the updated description', () => {
          expect(response.body.description).to.eq('A New Description');
        });

        it('does update the description', async () => {
          const createdDescription = await ApiKey.find({ description: 'A New Description' });
          expect(createdDescription).to.be.an('array').that.is.not.empty;
        });
      });
    });
  });
});
