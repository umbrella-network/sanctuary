import User, { IUser } from '../../src/models/User';
import { userFactory } from '../mocks/factories/userFactory';
import axios from 'axios';
import { loadTestEnv } from '../helpers';
import Project, { IProject } from '../../src/models/Project';
import ApiKey, { IApiKey } from '../../src/models/ApiKey';
import cryptoRandomString from 'crypto-random-string';
import { v4 } from 'uuid';

const config = loadTestEnv();
const adapter = axios.create({ baseURL: config.APP_URL });

const getTempUser = async (): Promise<IUser> => {
  const userAttributes = await userFactory.build();
  const user = new User(userAttributes);
  await user.save();
  return user;
};

const signIn = async (user: IUser): Promise<string> => {
  const response = await adapter.post('/auth', {
    email: user.email,
    password: 'PASSWORD',
  });

  return response.data.token;
};

const createProject = async (accessToken: string): Promise<IProject> => {
  const response = await adapter.post(
    '/projects',
    { name: 'First project' },
    { headers: { authorization: `Bearer ${accessToken}` } }
  );

  return response.data;
};

const generateAPIKey = async (accessToken: string, projectId: string): Promise<IApiKey> => {
  const key = await cryptoRandomString.async({ length: 64 });
  const apiKey = new ApiKey({ _id: v4(), key, projectId });
  await apiKey.save();
  return apiKey;
};

type TestUserHarness = {
  user: IUser;
  accessToken: string;
  project: IProject;
  apiKey: IApiKey;
};

const setupTestUser = async (): Promise<TestUserHarness> => {
  const user = await getTempUser();
  const accessToken = await signIn(user);
  const project = await createProject(accessToken);
  const apiKey = await generateAPIKey(accessToken, project._id);

  return { user, accessToken, project, apiKey };
};

const teardownTestUser = async (): Promise<void> => {
  await User.deleteMany();
  await Project.deleteMany();
  await ApiKey.deleteMany();
};

export { getTempUser, createProject, generateAPIKey, setupTestUser, teardownTestUser, TestUserHarness };