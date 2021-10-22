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
    const { audience, domain } = this.settings.auth.jwt;

    this.userAuthenticator = jwt({
      audience,
      issuer: `https://${domain}/`,
      algorithms: ['RS256'],
      credentialsRequired: true,
      secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://${domain}/.well-known/jwks.json`,
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
