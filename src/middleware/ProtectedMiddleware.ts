import { inject, injectable, postConstruct } from 'inversify';
import { Request, Response, NextFunction } from 'express';
import { RequestHandler } from 'express-jwt';

import { AuthenticationMiddleware } from './AuthenticationMiddleware';
import { ProjectAuthUtils } from '../services/ProjectAuthUtils';

@injectable()
export class ProtectedMiddleware extends AuthenticationMiddleware {
  @inject(ProjectAuthUtils)
  private projectAuthenticator: ProjectAuthUtils;

  private userAuthenticator!: RequestHandler;

  @postConstruct()
  setup(): void {
    this.userAuthenticator = this.setupRequestHandler();
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
