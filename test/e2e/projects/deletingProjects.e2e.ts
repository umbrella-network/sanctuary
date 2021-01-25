import axios from 'axios';
import { loadTestEnv } from '../../helpers';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import User from '../../../src/models/User';
import Project from '../../../src/models/Project';
import mongoose from 'mongoose';

chai.use(chaiAsPromised);

describe('Delete projects', () => {
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
      appAxios.delete('/projects/1', {
        headers: {
          authorization: '',
        },
      })
    ).to.be.rejected.then((error) => {
      expect(error.response.status).to.be.eq(403);
    });
  });

  it('responds with 404 if project with given id does not exist', async () => {
    await expect(
      appAxios.delete('/projects/1', {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      })
    ).to.be.rejected.then((error) => {
      expect(error.response.status).to.be.eq(404);
    });
  });

  it('deletes project', async () => {
    const { data: project } = await appAxios.post(
      '/projects',
      { name: 'Project name' },
      {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const response = await appAxios.delete(`/projects/${project._id}`, {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.status).to.be.eq(200);

    const responseAfterDeletion = await appAxios.get('/projects', {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(responseAfterDeletion.data.projects).to.be.empty;
  });
});
