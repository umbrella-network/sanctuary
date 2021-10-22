import { inject, injectable, postConstruct } from 'inversify';
import { AuthUtils } from '../services/AuthUtils';
import { Request, Response, NextFunction } from 'express';
import Settings from '../types/Settings';
import jwt, { RequestHandler } from 'express-jwt';
import jwksRsa from 'jwks-rsa';

@injectable()
export class AuthenticationMiddleware {
  @inject('Settings')
  private settings!: Settings;

  @inject(AuthUtils)
  private projectAuthenticator: AuthUtils;

  private userAuthenticator!: RequestHandler;

  @postConstruct()
  setup(): void {
    this.userAuthenticator = jwt({
      audience: this.settings.auth0.audience,
      issuer: this.settings.auth0.issuer,
      algorithms: ['RSA256'],
      credentialsRequired: true,
      secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: this.settings.auth0.jwksUri,
      }),
    });
  }

  apply = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    const projectAuthentication = await this.projectAuthenticator.verifyApiKey(request, response);

    if (projectAuthentication.apiKey) {
      request.params['currentProjectId'] = projectAuthentication.apiKey.projectId; //TODO: deprecate
      request.project = { id: projectAuthentication.apiKey.projectId };
      next();
    } else {
      this.userAuthenticator(request, response, next);
    }
  };
}
