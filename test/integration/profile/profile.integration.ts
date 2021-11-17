import 'reflect-metadata';
import { expect } from 'chai';
import Server from '../../../src/lib/Server';
import { Container } from 'inversify';
import { getContainer } from '../../../src/lib/getContainer';
import { loadTestEnv } from '../../helpers';
import request from 'supertest';
import { Application } from 'express';
import createJWKSMock, { JWKSMock } from 'mock-jwks';
import { after } from 'mocha';
import nock from 'nock';
import { setupDatabase, teardownDatabase } from '../../helpers/databaseHelpers';

describe('/profile', async () => {
  let container: Container;
  let app: Application;

  before(async () => {
    loadTestEnv();
    await setupDatabase();
    container = getContainer();
    app = container.get(Server).app;
  });

  after(async () => {
    await teardownDatabase();
    nock.restore();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('GET /profile', async () => {
    describe('when an invalid bearer token is provided', async () => {
      it('responds with HTTP 401 Unauthorized', async () => {
        const res = await request(app).get('/profile');
        expect(res.status).to.eq(401);
      });
    });

    describe('when a valid bearer token is provided', async () => {
      let jwksMock: JWKSMock;
      let accessToken: string;
      const profile = { user_id: 'USER_ID', username: 'test.user', name: 'Test User', email: 'test.user@example.com' };

      beforeEach(async () => {
        jwksMock = createJWKSMock('https://example.com/');
        await jwksMock.start();

        accessToken = jwksMock.token({
          aud: 'TEST_AUDIENCE',
          iss: 'https://example.com/',
          sub: 'USER_ID',
        });

        nock('https://test.auth0.com').post('/oauth/token').reply(200, 'MANAGEMENT_API_ACCESS_TOKEN');
        nock('https://test.auth0.com').get('/api/v2/users/USER_ID').reply(200, profile);
      });

      afterEach(async () => {
        await jwksMock.stop();
      });

      it('responds with the user profile', async () => {
        const res = await request(app).get('/profile').set('Authorization', `Bearer ${accessToken}`);

        const profile = res.body.data;
        expect(res.status).to.eq(200);
        expect(profile.id).to.eq('USER_ID');
        expect(profile.username).to.eq('test.user');
        expect(profile.name).to.eq('Test User');
        expect(profile.email).to.eq('test.user@example.com');
      });
    });
  });

  describe('PUT /profile', async () => {
    describe('when an invalid bearer token is provided', async () => {
      it('responds with HTTP 401 Unauthorized', async () => {
        const res = await request(app).put('/profile').send({ email: 'new.email@example.com' });
        expect(res.status).to.eq(401);
      });
    });

    describe('when a valid bearer token is provided', async () => {
      let jwksMock: JWKSMock;
      let accessToken: string;
      const profile = { user_id: 'USER_ID', username: 'test.user', name: 'Test User', email: 'test.user@example.com' };

      beforeEach(async () => {
        jwksMock = createJWKSMock('https://example.com/');
        await jwksMock.start();

        accessToken = jwksMock.token({
          aud: 'TEST_AUDIENCE',
          iss: 'https://example.com/',
          sub: 'USER_ID',
        });

        nock('https://test.auth0.com').post('/oauth/token').reply(200, 'MANAGEMENT_API_ACCESS_TOKEN');
        nock('https://test.auth0.com').patch('/api/v2/users/USER_ID').reply(200, profile);
      });

      afterEach(async () => {
        await jwksMock.stop();
      });

      it('returns the updated user', async () => {
        const res = await request(app)
          .put('/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ data: { password: 'NEW_PASSWORD' } });

        const profile = res.body.data;
        expect(res.status).to.eq(200);
        expect(profile.id).to.eq('USER_ID');
        expect(profile.username).to.eq('test.user');
        expect(profile.name).to.eq('Test User');
        expect(profile.email).to.eq('test.user@example.com');
        expect(profile.password).to.eq(undefined);
      });
    });
  });
});
