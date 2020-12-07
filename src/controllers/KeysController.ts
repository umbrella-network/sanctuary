import { injectable } from 'inversify';
import express, { Request, Response } from 'express';
import * as feeds from '../config/feeds.json';

@injectable()
class KeysController {
  router: express.Router;

  constructor() {
    this.router = express
      .Router()
      .get('/', this.index);
  }

  index = async (request: Request, response: Response): Promise<void> => {
    response.send({ data: feeds.data });
  }
}

export default KeysController;
