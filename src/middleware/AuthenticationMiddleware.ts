import { inject, injectable, postConstruct } from 'inversify';
import { Request, Response, NextFunction } from 'express';
import jwt, { RequestHandler } from 'express-jwt';
import jwksRsa from 'jwks-rsa';

import { ProjectAuthUtils } from '../services/ProjectAuthUtils';
import { getAuthorizationHeader } from '../utils/getAuthorizationHeader';
import Settings from '../types/Settings';

@injectable()
export class AuthenticationMiddleware {
  @inject('Settings')
  private settings!: Settings;

  @inject(ProjectAuthUtils)
  private projectAuthenticator: ProjectAuthUtils;

  private userAuthenticator!: RequestHandler;

  @postConstruct()
  setup(): void {
    const { audience, domain } = this.settings.auth.jwt;

    this.userAuthenticator = <RequestHandler>jwt({
      audience,
      issuer: `https://${domain}/`,
      algorithms: ['RS256', 'HS256'],
      credentialsRequired: true,
      secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://${domain}/.well-known/jwks.json`,
      }),
      getToken: getAuthorizationHeader,
    });
  }

  apply = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    const projectAuthentication = await this.projectAuthenticator.verifyApiKey(request);

    if (projectAuthentication?.apiKey) {
      request.params['currentProjectId'] = projectAuthentication.apiKey.projectId; //TODO: deprecate
      request.project = { id: projectAuthentication.apiKey.projectId };
      next();
    } else {
      this.userAuthenticator(request, response, next);
    }
  };
}
