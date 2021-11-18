import { inject, injectable, postConstruct } from 'inversify';
import { ProjectAuthUtils } from '../services/ProjectAuthUtils';
import { Request, Response, NextFunction } from 'express';
import Settings from '../types/Settings';
import jwt, { RequestHandler } from 'express-jwt';
import jwksRsa from 'jwks-rsa';

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

    this.userAuthenticator = jwt({
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
    });
  }

  apply = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    if (!request.headers.authorization) {
      const error = new Error();
      error.name = 'UnauthorizedError';
      throw error;
    }

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
