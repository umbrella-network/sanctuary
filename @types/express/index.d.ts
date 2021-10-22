import Project from '../../src/models/Project';
import StatsdClient from 'statsd-client';

declare global {
  namespace Express {
    interface User {
      sub: string;
      name?: string;
      admin?: boolean;
    }

    interface Request {
      currentProject?: Project;
      currentUser?: User;
    }

    interface Response {
      metrics?: {
        metric: string;
        delta?: number;
        tags?: StatsdClient.Tags;
      }
    }
  }
}
