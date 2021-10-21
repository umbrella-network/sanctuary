import axios from 'axios';
import { loadTestEnv } from '../../helpers';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import User from '../../../src/models/LocalUser';
import Project from '../../../src/models/Project';
import ApiKey from '../../../src/models/ApiKey';
import mongoose from 'mongoose';

chai.use(chaiAsPromised);

describe('Delete API key', () => {
  const config = loadTestEnv();
  const appAxios = axios.create({ baseURL: config.APP_URL });
  let accessToken: string;
  let projectId: string;
  let apiKeyId: string;

  before(async () => {
    await mongoose.connect(config.MONGODB_URL, { useNewUrlParser: true, useUnifiedTopology: true });
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Project.deleteMany({});
    await ApiKey.deleteMany({});

    await appAxios.post('/users', {
      email: 'example@example.com',
      password: 'valid_password',
    });

    const response = await appAxios.post('/auth', {
      email: 'example@example.com',
      password: 'valid_password',
    });

    accessToken = response.data.token;

    const projectResponse = await appAxios.post(
      '/projects',
      {
        name: 'Project name',
      },
      { headers: { authorization: `Bearer ${accessToken}` } }
    );
    projectId = projectResponse.data._id;
    const apiKeyResponse = await appAxios.post(
      '/api-keys',
      {
        projectId,
      },
      { headers: { authorization: `Bearer ${accessToken}` } }
    );
    apiKeyId = apiKeyResponse.data._id;
  });

  after(async () => {
    await User.deleteMany({});
    await Project.deleteMany({});
    await ApiKey.deleteMany({});

    await mongoose.connection.close();
  });

  it('responds with 403 if no access token was provided', async () => {
    await expect(appAxios.delete('/api-keys/1', { headers: { authorization: '' } })).to.be.rejected.then((error) => {
      expect(error.response.status).to.be.eq(403);
    });
  });

  it('responds with 404 if no key found with specified id', async () => {
    await expect(
      appAxios.delete('/api-keys/99999', {
        headers: {
          authorization: accessToken,
        },
      })
    ).to.be.rejected.then((error) => {
      expect(error.response.status).to.be.eq(404);
    });
  });

  it('responds with 403 if the key is for a project that the current user doest not own', async () => {
    await appAxios.post('/users', {
      email: 'another-user@example.com',
      password: 'valid_password',
    });

    const response = await appAxios.post('/auth', {
      email: 'another-user@example.com',
      password: 'valid_password',
    });

    const accessTokenOfAnotherUser = response.data.token;

    await expect(
      appAxios.delete(`/api-keys/${apiKeyId}`, { headers: { authorization: accessTokenOfAnotherUser } })
    ).to.be.rejected.then((error) => {
      expect(error.response.status).to.be.eq(403);
    });
  });

  it('deletes API key', async () => {
    const response = await appAxios.delete(`/api-keys/${apiKeyId}`, { headers: { authorization: accessToken } });

    expect(response.status).to.be.eq(200);
  });
});
