import 'reflect-metadata';
import { Container } from 'inversify';
import { expect } from 'chai';
import request from 'supertest';
import { Application } from 'express';

import { setupDatabase, teardownDatabase } from '../../helpers/databaseHelpers';
import { setupJWKSMock, TestAuthHarness } from '../../helpers/authHelpers';
import { getContainer } from '../../../src/lib/getContainer';
import Server from '../../../src/lib/Server';

describe('deletingProjects', () => {
  let authHarness: TestAuthHarness;
  let container: Container;
  let app: Application;

  before(async () => {
    await setupDatabase();

    container = getContainer();
    app = container.get(Server).app;
  });

  after(async () => {
    await teardownDatabase();
  });

  describe('DELETE /projects/:id', () => {
    describe('when no bearer token is provided', () => {
      it('responds with HTTP 401 Unauthorized', async () => {
        const response = await request(app).delete('/projects/1');

        expect(response.status).to.eq(401);
      });
    });

    describe('when an invalid bearer token is provided', () => {
      it('responds with HTTP 401 Unauthorized', async () => {
        const response = await request(app).delete('/projects/1').set('Authorization', 'Bearer wrongBearer');

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

      describe('when project with given id does not exist is provided', () => {
        it('responds with 404', async () => {
          const response = await request(app)
            .delete('/projects/1')
            .set('Authorization', `Bearer ${authHarness.accessToken}`);

          expect(response.status).to.be.eq(404);
        });
      });

      describe('when project with given id that exist is provided', () => {
        it('deletes project', async () => {
          const { body: project } = await request(app)
            .post('/projects')
            .send({ name: 'Project name' })
            .set('Authorization', `Bearer ${authHarness.accessToken}`);

          const response = await request(app)
            .delete(`/projects/${project._id}`)
            .set('Authorization', `Bearer ${authHarness.accessToken}`);

          expect(response.status).to.be.eq(200);

          const responseAfterDeletion = await request(app)
            .get('/projects')
            .set('Authorization', `Bearer ${authHarness.accessToken}`);

          expect(responseAfterDeletion.body.projects).to.be.empty;
        });
      });
    });
  });
});
