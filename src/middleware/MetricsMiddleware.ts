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

      if (req.project) {
        tags ||= {};
        tags = { projectId: req.project.id, ...tags };
      }

      if (delta && tags) {
        this.statsdClient?.increment(metric, delta, tags);
      } else if (delta) {
        this.statsdClient?.increment(metric, delta);
      } else if (tags) {
        this.statsdClient?.increment(metric, 1, tags);
      } else {
        this.statsdClient?.increment(metric);
      }
    }

    next();
  };
}
