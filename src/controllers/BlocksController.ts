import { injectable } from 'inversify';
import express, { Request, Response } from 'express';
import Block, { IBlock } from '../models/Block';
import Leaf, { ILeaf } from '../models/Leaf';

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
    let blocks = await Block.find({});
    response.send(blocks);
  }

  show = async (request: Request, response: Response): Promise<void> => {
    let block = await Block.findById(request.params.id);
    response.send({data: block});
  }

  leaves = async (request: Request, response: Response): Promise<void> => {
    let leaves = await Leaf.find({blockId: request.params.id});
    response.send(leaves);
  }
}

export default BlocksController;
