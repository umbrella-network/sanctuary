import axios from 'axios';
import { loadTestEnv } from '../../helpers';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import User from '../../../src/models/User';
import mongoose from 'mongoose';

chai.use(chaiAsPromised);

describe('Getting current user by access token', () => {
  const config = loadTestEnv();
  const appAxios = axios.create({ baseURL: config.APP_URL });

  before(async () => {
    await mongoose.connect(config.MONGODB_URL, { useNewUrlParser: true, useUnifiedTopology: true });
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  after(async () => {
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  it('fails with status 403 if no token was provided', async () => {
    await expect(
      appAxios.get('/users', {
        headers: {
          authorization: '',
        },
      })
    ).to.be.rejected.then((error) => {
      expect(error.response.status).to.be.eq(403);
    });
  });

  it('fails with status 403 if invalid token was provided', async () => {
    await expect(
      appAxios.get('/users', {
        headers: {
          authorization: 'Bearer an-invalid-token',
        },
      })
    ).to.be.rejected.then((error) => {
      expect(error.response.status).to.be.eq(403);
    });
  });

  it('returns current user', async () => {
    await appAxios.post('/users', {
      email: 'example@example.com',
      password: 'valid_password',
    });

    const {
      data: { token },
    } = await appAxios.post('/auth', {
      email: 'example@example.com',
      password: 'valid_password',
    });

    const response = await appAxios.get('/users', {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.status).to.be.eq(200);
    expect(response.data).to.have.nested.property('user.id');
    expect(response.data).to.have.nested.property('user.email', 'example@example.com');
  });
});
