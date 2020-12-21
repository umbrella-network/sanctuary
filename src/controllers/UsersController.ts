import { injectable } from 'inversify';
import express, { Request, Response } from 'express';

@injectable()
class UsersController {
  router: express.Application;

  constructor() {
    this.router = 
      express()
        .post('/', this.create);
  }

  create = async (request: Request, response: Response): Promise<void> => {
    response.send({ token: 'yes' });
  }
}

export default UsersController;
