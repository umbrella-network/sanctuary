import { inject, injectable } from 'inversify';
import { AuthUtils } from '../services/AuthUtils';
import { Request, Response, NextFunction } from 'express';

@injectable()
export class AuthenticationMiddleware {
  @inject(AuthUtils)
  private authUtils: AuthUtils;

  apply = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    const authentication = await this.authUtils.verifyApiKey(request, response);
    if (!authentication.apiKey) return response.status(403).end();

    request.params['currentProjectId'] = authentication.apiKey.projectId;
    next();
  };
}
