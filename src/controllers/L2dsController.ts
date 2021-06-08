import { injectable } from 'inversify';
import express, { Request, Response } from 'express';
import loadL2DKeys from '../services/LoadL2DKeys';

@injectable()
class L2dsController {
  router: express.Application;

  constructor() {
    this.router = express().get('/', this.index);
  }

  index = async (request: Request, response: Response): Promise<void> => {
    try {
      const layer2DataKeys = await loadL2DKeys();
      response.send(layer2DataKeys);
    } catch (err) {
      response.sendStatus(500);
    }
  };
}

export default L2dsController;
