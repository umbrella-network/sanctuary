import { inject, injectable } from 'inversify';
import express, { Request, Response } from 'express';
import Project from '../models/Project';
import ApiKey from '../models/ApiKey';
import { AuthUtils } from '../services/AuthUtils';
import APIUsageRepository from '../services/analytics/APIUsageRepository';

@injectable()
class UsageMetricsController {
  router: express.Router;
  defaultPeriod: '1h';

  constructor(@inject(AuthUtils) private readonly authUtils: AuthUtils) {
    this.router = express.Router().get('/', this.index);
  }

  index = async (request: Request, response: Response): Promise<void> => {
    const tokenResult = this.authUtils.getAuthorizationToken(request.headers.authorization);

    if (!tokenResult.token) {
      response.status(403).send({ error: tokenResult.errorMessage });
      return;
    }

    const userProjects = await Project.find({ ownerId: tokenResult.token.userId }, { _id: true, apiKeys: true });
    const projectIds: string[] = userProjects.map(({ _id }) => _id);

    const apiKeys = await ApiKey.find({ projectId: { $in: projectIds } }, { key: true });
    const keys: string[] = apiKeys.map(({ key }) => key);

    const period = request.query?.period as string ?? this.defaultPeriod;

    try {
      const usageMetrics = await APIUsageRepository.retrieveUsageMetrics(keys, period);

      response.send(usageMetrics);
    } catch (error) {
      const isInternal = error?.message;
      const code = isInternal ? 500 : 403;
      const body = isInternal ? "" : { error };

      if (isInternal) {
        console.error(error.message);
      }

      response.status(code).send(body);
    }
  };
}

export default UsageMetricsController;
