import { injectable } from 'inversify';
import express, { Request, Response } from 'express';
import Block from '../models/Block';
import Leaf, { ILeaf } from '../models/Leaf';
import { getModelForClass } from '@typegoose/typegoose';

@injectable()
class ProofsController {
  router: express.Router;

  constructor() {
    this.router = express
      .Router()
      .get('/', this.index);
  }

  index = async (request: Request, response: Response): Promise<void> => {
    const block = await Block.findOne({status: 'finalized'}).sort({height: -1}).limit(1);
    const keys = request.query.keys as string[];
    const leaves = await Leaf.find({blockId: block.id, key: {$in: keys}});
    response.send({ data: {block: block, keys: keys, leaves: leaves} });
  }
}

export default ProofsController;
