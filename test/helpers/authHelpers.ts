import createJWKSMock, { JWKSMock } from 'mock-jwks';

export type TestAuthHarness = {
  accessToken: string;
  jwksMock: JWKSMock;
};

export async function setupAuthHarness(): Promise<TestAuthHarness> {
  const jwksMock = createJWKSMock('https://example.com/');
  await jwksMock.start();

  const accessToken = jwksMock.token({
    aud: 'TEST_AUDIENCE',
    iss: 'https://example.com/',
    sub: 'USER_ID',
  });

  return { accessToken, jwksMock };
}
