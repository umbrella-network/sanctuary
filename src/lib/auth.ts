import * as jwt from 'jsonwebtoken';

interface Token {
  userId: number;
  exp: number;
}

export function getAuthorizationToken(authorizationHeader: string): Token | undefined {
  const token = authorizationHeader.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, process.env.AUTH_PRIVATE_KEY);
    return decoded;
  } catch {
    return;
  }
}
