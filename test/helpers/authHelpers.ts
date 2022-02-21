import createJWKSMock, { JWKSMock } from 'mock-jwks';

import User, { ILocalUser } from '../../src/models/LocalUser';
import Project, { IProject } from '../../src/models/Project';
import ApiKey, { IApiKey } from '../../src/models/ApiKey';

export type TestAuthHarness = {
  accessToken: string;
  jwksMock: JWKSMock;
};

export type TestUserHarness = {
  user: ILocalUser;
  project: IProject;
  apiKey: IApiKey;
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

export const teardownTestUser = async (): Promise<void> => {
  await Promise.all([User.deleteMany(), ApiKey.deleteMany(), Project.deleteMany()]);
};
