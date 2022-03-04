import { inject, injectable } from 'inversify';
import { Request, Response, NextFunction } from 'express';

import { ProjectAuthUtils } from '../services/ProjectAuthUtils';
import { getAuthorizationHeader } from '../utils/getAuthorizationHeader';

@injectable()
export class ProjectAuthenticationMiddleware {
  @inject(ProjectAuthUtils)
  private projectAuthenticator: ProjectAuthUtils;

  apply = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    const projectAuthentication = await this.projectAuthenticator.verifyApiKey(request);
    const authorization = getAuthorizationHeader(request);

    if (projectAuthentication?.apiKey || !authorization) {
      response.locals.isAuthorized = Boolean(authorization);

      if (projectAuthentication?.apiKey) {
        request.params['currentProjectId'] = projectAuthentication?.apiKey?.projectId; //TODO: deprecate
        request.project = { id: projectAuthentication?.apiKey?.projectId };
      }

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
