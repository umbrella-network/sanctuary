import * as jwt from 'jsonwebtoken';
import Token from '../types/Token';

export function getAuthorizationToken(authorizationHeader: string): Token | undefined {
  if (!authorizationHeader) {
    return;
  }

  const token = authorizationHeader.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, process.env.AUTH_PRIVATE_KEY);
    return decoded as Token;
  } catch {
    return;
  }
}
