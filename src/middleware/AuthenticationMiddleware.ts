import { inject, injectable } from 'inversify';
import jwksRsa from 'jwks-rsa';
import { Request, Response, NextFunction } from 'express';
import jwt, { RequestHandler } from 'express-jwt';

import Settings from '../types/Settings';

@injectable()
export abstract class AuthenticationMiddleware {
  @inject('Settings')
  private settings!: Settings;

  abstract apply: (request: Request, response: Response, next: NextFunction) => Promise<void>;

  getAuthorizationHeader = (request: Request): string | null => {
    if (request.headers.authorization?.split(' ')[0] === 'Bearer') {
      return request.headers.authorization.split(' ')[1];
    }

    if (request.headers.authorization) {
      return request.headers.authorization;
    }

    return null;
  };

  setupRequestHandler = (credentialsRequired = true): RequestHandler => {
    const { audience, domain } = this.settings.auth.jwt;

    return <RequestHandler>jwt({
      audience,
      issuer: `https://${domain}/`,
      algorithms: ['RS256', 'HS256'],
      credentialsRequired,
      secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://${domain}/.well-known/jwks.json`,
      }),
      getToken: this.getAuthorizationHeader,
    });
  };

  throwUnauthorizedError = (): void => {
    const error = new Error();
    error.name = 'UnauthorizedError';
    throw error;
  };
}
