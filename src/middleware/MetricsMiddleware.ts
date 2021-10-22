import { inject, injectable } from 'inversify';
import StatsdClient from 'statsd-client';
import { Request, Response, NextFunction } from 'express';

@injectable()
export class MetricsMiddleware {
  @inject('StatsdClient')
  private statsdClient?: StatsdClient;

  apply = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (res.metrics) {
      const { metric, delta } = res.metrics;
      let { tags } = res.metrics;

      if (req.currentProject) {
        tags = { projectId: req.currentProject.id, ...tags };
      }

      if (delta && tags) {
        this.statsdClient?.increment(metric, delta, tags);
      } else {
        this.statsdClient?.increment(metric);
      }
    }

    next();
  }
}
