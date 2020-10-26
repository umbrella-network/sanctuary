import { injectable } from 'inversify';
import express, { Request, Response } from 'express';
import Block, { IBlock } from '../models/Block';

@injectable()
class BlocksController {
  router: express.Application;

  constructor() {
    this.router = express()
      .get('/', this.index);
  }

  index = async (request: Request, response: Response): Promise<void> => {
    let blocks = await Block.find({});
    response.send(blocks);
  }

  show = async (request: Request, response: Response): Promise<void> => {
    response.send('pong');
  }
}

export default BlocksController;
