import { Request } from 'express';

export const getAuthorizationHeader = (request: Request): string | null => {
  if (request.headers.authorization?.split(' ')[0] === 'Bearer') {
    return request.headers.authorization.split(' ')[1];
  }

  if (request.headers.authorization) {
    return request.headers.authorization;
  }

  return null;
};
