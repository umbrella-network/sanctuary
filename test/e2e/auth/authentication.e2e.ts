import axios from 'axios';
import { loadTestEnv } from '../../helpers';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import User from '../../../src/models/LocalUser';
import mongoose from 'mongoose';

chai.use(chaiAsPromised);

describe('Authentication', () => {
  const config = loadTestEnv();
  const appAxios = axios.create({ baseURL: config.APP_URL });

  before(async () => {
    await mongoose.connect(config.MONGODB_URL, { useNewUrlParser: true, useUnifiedTopology: true });
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await appAxios.post('/users', {
      email: 'example@example.com',
      password: 'valid_password',
    });
  });

  after(async () => {
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  it('creates access token if credentials are correct', async () => {
    const response = await appAxios.post('/auth', {
      email: 'example@example.com',
      password: 'valid_password',
    });

    expect(response.status).to.be.eq(201);
    expect(response.data.token).to.be.a('string');
  });

  it('responds with 422 if email or password is not provided', async () => {
    await expect(
      appAxios.post('/auth', {
        email: 'example@example.com',
      })
    ).to.be.rejected.then((error) => {
      expect(error.response.status).to.be.eq(422);
    });

    await expect(
      appAxios.post('/auth', {
        password: 'valid_password',
      })
    ).to.be.rejected.then((error) => {
      expect(error.response.status).to.be.eq(422);
    });
  });

  it('responds with 403 when there is no user with provided email', async () => {
    await expect(
      appAxios.post('/auth', {
        email: 'other-email@example.com',
        password: 'valid_password',
      })
    ).to.be.rejected.then((error) => {
      expect(error.response.status).to.be.eq(403);
    });
  });

  it('responds with 403 if password is wrong', async () => {
    await expect(
      appAxios.post('/auth', {
        email: 'other-email@example.com',
        password: 'wrong_password',
      })
    ).to.be.rejected.then((error) => {
      expect(error.response.status).to.be.eq(403);
    });
  });
});
