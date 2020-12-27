import * as jwt from 'jsonwebtoken';

export function getAuthorizationToken(authorizationHeader: string): object | undefined {
  const token = authorizationHeader.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, process.env.AUTH_PRIVATE_KEY);
    return (decoded as any);
  } catch {
    return;
  }
}