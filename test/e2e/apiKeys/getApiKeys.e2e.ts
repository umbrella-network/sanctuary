import axios from 'axios';
import { loadTestEnv } from '../../helpers';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import User from '../../../src/models/LocalUser';
import Project from '../../../src/models/Project';
import ApiKey from '../../../src/models/ApiKey';
import mongoose from 'mongoose';

chai.use(chaiAsPromised);

describe('Get API keys', () => {
  const config = loadTestEnv();
  const appAxios = axios.create({ baseURL: config.APP_URL });
  let accessToken: string;
  let firstProjectId: string;
  let secondProjectId: string;

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

    const firstProjectResponse = await appAxios.post(
      '/projects',
      { name: 'First project' },
      { headers: { authorization: `Bearer ${accessToken}` } }
    );
    firstProjectId = firstProjectResponse.data._id;

    const secondProjectResponse = await appAxios.post(
      '/projects',
      { name: 'Second project' },
      { headers: { authorization: `Bearer ${accessToken}` } }
    );
    secondProjectId = secondProjectResponse.data._id;
  });

  after(async () => {
    await User.deleteMany({});
    await Project.deleteMany({});
    await ApiKey.deleteMany({});

    await mongoose.connection.close();
  });

  it('responds with 403 if no access token was provided', async () => {
    await expect(
      appAxios.get('/api-keys', {
        headers: {
          authorization: '',
        },
      })
    ).to.be.rejected.then((error) => {
      expect(error.response.status).to.be.eq(403);
    });
  });

  it('returns keys for both projects if projectId is not specified', async () => {
    // a key for the first project
    await appAxios.post(
      '/api-keys',
      {
        projectId: firstProjectId,
      },
      { headers: { authorization: accessToken } }
    );

    // a key for the second project
    await appAxios.post(
      '/api-keys',
      {
        projectId: secondProjectId,
      },
      { headers: { authorization: accessToken } }
    );

    const response = await appAxios.get('/api-keys', {
      headers: {
        authorization: accessToken,
      },
    });

    expect(response.status).to.be.eq(200);

    const apiKeys: Record<string, unknown>[] = response.data;

    const apiKeyForFirstProject = apiKeys.find((apiKey) => apiKey.projectId === firstProjectId);
    expect(apiKeyForFirstProject).to.be.an('object', 'Not found an API key for the first project');
    const apiKeyForSecondProject = apiKeys.find((apiKey) => apiKey.projectId === secondProjectId);
    expect(apiKeyForSecondProject).to.be.an('object', 'Not found an API key for the second project');
  });

  it('returns keys only for the specified project when projectId is provided', async () => {
    // a key for the first project
    await appAxios.post(
      '/api-keys',
      {
        projectId: firstProjectId,
      },
      { headers: { authorization: accessToken } }
    );

    // a key for the second project
    await appAxios.post(
      '/api-keys',
      {
        projectId: secondProjectId,
      },
      { headers: { authorization: accessToken } }
    );

    const response = await appAxios.get('/api-keys', {
      params: {
        projectId: firstProjectId,
      },
      headers: {
        authorization: accessToken,
      },
    });

    expect(response.status).to.be.eq(200);

    const apiKeys: Record<string, unknown>[] = response.data;

    apiKeys.forEach((apiKey) => {
      expect(apiKey.projectId).to.be.eq(firstProjectId);
    });
  });
});
