import { inject, injectable, postConstruct } from 'inversify';
import { Request, Response, NextFunction } from 'express';
import { RequestHandler } from 'express-jwt';

import { AuthenticationMiddleware } from './AuthenticationMiddleware';
import { ProjectAuthUtils } from '../services/ProjectAuthUtils';

@injectable()
export class RestrictedMiddleware extends AuthenticationMiddleware {
  @inject(ProjectAuthUtils)
  private projectAuthenticator: ProjectAuthUtils;

  private userAuthenticator!: RequestHandler;

  @postConstruct()
  setup(): void {
    this.userAuthenticator = this.setupRequestHandler();
  }

  apply = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    const authorizationKey = this.getAuthorizationHeader(request);

    if (!authorizationKey) {
      this.throwUnauthorizedError();
    }

    const apiKey = this.projectAuthenticator.verifyRestrictApiKey(authorizationKey);

    if (apiKey?.apiKey) {
      next();
    } else {
      this.userAuthenticator(request, response, next);
    }
  };
}
