import { injectable } from 'inversify';
import express, { Request, Response } from 'express';
import Block from '../models/Block';
import Leaf from '../models/Leaf';

@injectable()
class BlocksController {
  router: express.Application;

  constructor() {
    this.router = express()
      .get('/', this.index)
      .get('/:id', this.show)
      .get('/:id/leaves', this.leaves);
  }

  index = async (request: Request, response: Response): Promise<void> => {
    const offset: number = parseInt(<string> request.query.offset) || 0;
    const limit: number = parseInt(<string> request.query.limit) || 100;

    const blocks = await Block
      .find({status: 'finalized'})
      .skip(offset)
      .limit(limit)
      .sort({ height: -1 })
      .exec();

    response.send(blocks);
  }

  show = async (request: Request, response: Response): Promise<void> => {
    const block = await Block.findById(request.params.id);
    response.send({data: block});
  }

  leaves = async (request: Request, response: Response): Promise<void> => {
    const leaves = await Leaf.find({blockId: request.params.id});
    response.send(leaves);
  }
}

export default BlocksController;
