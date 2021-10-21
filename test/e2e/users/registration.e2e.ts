import axios from 'axios';
import { loadTestEnv } from '../../helpers';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import User from '../../../src/models/LocalUser';
import mongoose from 'mongoose';

chai.use(chaiAsPromised);

describe('User registration', () => {
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

  it('fails if password is less than 8 characters long', async () => {
    await expect(
      appAxios.post('/users', {
        email: 'example@example.com',
        password: '1234567',
      })
    ).to.be.rejected.then((error) => {
      expect(error.response.status).to.be.eq(422);
    });
  });

  it('fails if email is invalid', async () => {
    await expect(
      appAxios.post('/users', {
        email: 'invalid email',
        password: 'valid_password',
      })
    ).to.be.rejected.then((error) => {
      expect(error.response.status).to.be.eq(422);
    });
  });

  it('successfully registers when input is valid', async () => {
    const response = await appAxios.post('/users', {
      email: 'example@example.com',
      password: 'valid_password',
    });

    expect(response.status).to.be.eq(201);
    expect(response.data).to.have.nested.property('user.email', 'example@example.com');
    expect(response.data).to.have.nested.property('user.id');
    expect(response.data).to.have.nested.property('user.verified', false);
  });

  it('responds with 422 if email is already used', async () => {
    await appAxios.post('/users', {
      email: 'example@example.com',
      password: 'valid_password',
    });

    await expect(
      appAxios.post('/users', {
        email: 'example@example.com',
        password: 'valid_password',
      })
    ).to.be.rejected.then((error) => {
      expect(error.response.status).to.be.eq(422);
    });
  });
});
