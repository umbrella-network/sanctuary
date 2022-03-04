import { inject, injectable } from 'inversify';
import { Request, Response, NextFunction } from 'express';

import { ProjectAuthUtils } from '../services/ProjectAuthUtils';
import { getAuthorizationHeader } from '../utils/getAuthorizationHeader';

@injectable()
export class RestrictedMiddleware {
  @inject(ProjectAuthUtils)
  private projectAuthenticator: ProjectAuthUtils;

  apply = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    const authorizationKey = getAuthorizationHeader(request);

    if (!authorizationKey) {
      this.throwUnauthorizedError();
    }

    const apiKey = this.projectAuthenticator.verifyRestrictApiKey(authorizationKey);

    if (apiKey?.apiKey) {
      next();
    } else {
      this.throwUnauthorizedError();
    }
  };

  private throwUnauthorizedError = (): void => {
    const error = new Error();
    error.name = 'UnauthorizedError';
    throw error;
  };
}
