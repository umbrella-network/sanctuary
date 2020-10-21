import { injectable } from 'inversify';
import express, { Request, Response } from 'express';

@injectable()
class BlocksController {
  router: express.Application;

  constructor() {
    this.router = express().get('/blocks', this.blocks);
  }

  blocks = async (request: Request, response: Response): Promise<void> => {
    response.send('pong');
  }
}

export default BlocksController;
