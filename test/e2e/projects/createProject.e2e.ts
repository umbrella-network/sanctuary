import axios from 'axios';
import { loadTestEnv } from '../../helpers';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import User from '../../../src/models/User';
import Project from '../../../src/models/Project';
import mongoose from 'mongoose';

chai.use(chaiAsPromised);

describe('Project creation', () => {
  const config = loadTestEnv();
  const appAxios = axios.create({ baseURL: config.APP_URL });
  let accessToken: string;

  before(async () => {
    await mongoose.connect(config.MONGODB_URL, { useNewUrlParser: true, useUnifiedTopology: true });
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Project.deleteMany({});

    await appAxios.post('/users', {
      email: 'example@example.com',
      password: 'valid_password',
    });

    const response = await appAxios.post('/auth', {
      email: 'example@example.com',
      password: 'valid_password',
    });

    accessToken = response.data.token;
  });

  after(async () => {
    await User.deleteMany({});
    await Project.deleteMany({});

    await mongoose.connection.close();
  });

  it('responds with 403 if no access token was provided', async () => {
    await expect(
      appAxios.post(
        '/projects',
        {
          name: 'example@example.com',
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

  it('responds with 400 if no project name was provided', async () => {
    await expect(
      appAxios.post(
        '/projects',
        {
          name: '',
        },
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

  it('creates project if input is valid', async () => {
    const response = await appAxios.post(
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

    expect(response.status).to.be.eq(201);
    expect(response.data).to.have.property('name', 'Project name');
  });
});
