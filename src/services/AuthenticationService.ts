import { inject, injectable } from 'inversify';
import Settings from '../types/Settings';
import jwt, { RequestHandler } from 'express-jwt';
import jwksRsa from 'jwks-rsa';

@injectable()
export class AuthenticationService {
  @inject('Settings')
  private settings!: Settings['auth0'];

  getJWTRequestHandler(): RequestHandler {
    return jwt({
      secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: this.settings.jwksUri,
      }),
      audience: this.settings.audience,
      issuer: this.settings.issuer,
      algorithms: ['RSA256'],
    });
  }
}
