import createJWKSMock, { JWKSMock } from 'mock-jwks';

import User from '../../src/models/LocalUser';
import Project from '../../src/models/Project';
import ApiKey, { IApiKey } from '../../src/models/ApiKey';
import { projectFactory } from '../mocks/factories/projectFactory';
import { apiKeyFactory } from '../mocks/factories/apiKeyFactory';
import { createHash } from 'crypto';

export type TestAuthHarness = {
  accessToken: string;
  jwksMock: JWKSMock;
};

export async function setupJWKSMock(): Promise<TestAuthHarness> {
  const jwksMock = createJWKSMock('https://example.com/');
  await jwksMock.start();

  const accessToken = jwksMock.token({
    aud: 'TEST_AUDIENCE',
    iss: 'https://example.com/',
    sub: 'USER_ID',
  });

  return { accessToken, jwksMock };
}

export const setupApiKey = async (): Promise<IApiKey> => {
  const project = await Project.create({ ...projectFactory.build(), ownerId: 'USER_ID', ownerType: 'User' });
  const apiKey = await ApiKey.create({
    ...apiKeyFactory.build(),
    key: createHash('sha256').digest('hex'),
    projectId: project.id,
  });

  return apiKey;
};

export const teardownTestUser = async (): Promise<void> => {
  await Promise.all([User.deleteMany(), ApiKey.deleteMany(), Project.deleteMany()]);
};
