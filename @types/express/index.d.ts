import Project from '../../src/models/Project';

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
  }
}
