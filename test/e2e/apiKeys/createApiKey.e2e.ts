import axios from 'axios';
import { loadTestEnv } from '../../helpers';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import User from '../../../src/models/LocalUser';
import Project from '../../../src/models/Project';
import ApiKey from '../../../src/models/ApiKey';
import mongoose from 'mongoose';

chai.use(chaiAsPromised);

describe('Create API key', () => {
  const config = loadTestEnv();
  const appAxios = axios.create({ baseURL: config.APP_URL });
  let accessToken: string;
  let projectId: string;

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
      {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      }
    );
    projectId = projectResponse.data._id;
  });

  after(async () => {
    await User.deleteMany({});
    await Project.deleteMany({});
    await ApiKey.deleteMany({});

    await mongoose.connection.close();
  });

  it('responds with 403 if no access token was provided', async () => {
    await expect(
      appAxios.post(
        '/api-keys',
        {
          projectId,
        },
        {
          headers: {
            authorization: '',
          },
        }
      )
    ).to.be.rejected.then((error) => {
      expect(error.response.status).to.be.eq(403);
    });
  });

  it('responds with 400 if no projectId was provided', async () => {
    await expect(
      appAxios.post(
        '/api-keys',
        {},
        {
          headers: {
            authorization: accessToken,
          },
        }
      )
    ).to.be.rejected.then((error) => {
      expect(error.response.status).to.be.eq(400);
    });
  });

  it('responds with 404 if specified project not found', async () => {
    await expect(
      appAxios.post(
        '/api-keys',
        {
          projectId: 1000,
        },
        {
          headers: {
            authorization: accessToken,
          },
        }
      )
    ).to.be.rejected.then((error) => {
      expect(error.response.status).to.be.eq(404);
    });
  });

  it('Creates an API key if input is valid', async () => {
    const response = await appAxios.post(
      '/api-keys',
      {
        projectId,
      },
      {
        headers: {
          authorization: accessToken,
        },
      }
    );

    expect(response.status).to.be.eq(201);
    expect(response.data).to.have.property('_id').that.is.a('string');
    expect(response.data).to.have.property('key').that.is.a('string');
    expect(response.data).to.have.property('projectId', projectId);
    expect(response.data).to.have.property('expiresAt').that.is.null;
  });
});
