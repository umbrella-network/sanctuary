import { inject, injectable } from 'inversify';
import express, { Request, Response } from 'express';
import Project from '../models/Project';
import ApiKey from '../models/ApiKey';
import UsageMetricsRepository from '../services/analytics/UsageMetricsRepository';
import { AuthenticationMiddleware } from '../middleware/AuthenticationMiddleware';
import { translateAuth0UserId } from '../lib/translateAuth0UserId';

@injectable()
class UsageMetricsController {
  router: express.Router;

  constructor(@inject(AuthenticationMiddleware) authenticationMiddleware: AuthenticationMiddleware) {
    this.router = express.Router().use(authenticationMiddleware.apply).get('/', this.index);
  }

  index = async (request: Request, response: Response): Promise<void> => {
    const projectId = request.query?.projectId as string;
    const projectIdParam = projectId ? { _id: projectId } : {};
    const searchParams = { ownerId: translateAuth0UserId(request.user.sub), ...projectIdParam };
    const userProjects = await Project.find(searchParams, { _id: true, apiKeys: true });

    if (projectId && !userProjects.length) {
      response.status(404).send({ error: 'Project with provided ID not found' });
      return;
    }

    const projectIds: string[] = userProjects.map(({ _id }) => _id);
    const apiKeys = await ApiKey.find({ projectId: { $in: projectIds } }, { key: true });
    const keys: string[] = apiKeys.map(({ key }) => key);
    const period = request.query?.period as string;

    try {
      const usageMetrics = await UsageMetricsRepository.retrieveUsageMetrics(keys, period);
      response.send(usageMetrics);
    } catch (error) {
      const isInternal = error?.message;
      const code = isInternal ? 500 : 403;
      const body = isInternal ? '' : { error };

      if (isInternal) {
        console.error(error.message);
      }

      response.status(code).send(body);
    }
  };
}

export default UsageMetricsController;
