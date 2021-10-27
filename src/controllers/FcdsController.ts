import { inject, injectable } from 'inversify';
import express, { Request, Response } from 'express';
import FCD from '../models/FCD';
import Settings from '../types/Settings';

@injectable()
class FcdsController {
  @inject('Settings') private readonly settings: Settings;

  router: express.Application;

  constructor() {
    this.router = express().get('/', this.index).get('/:chainId', this.index);
  }

  index = async (request: Request, response: Response): Promise<void> => {
    const chainId = <string>(
      (request.query.chainId || request.params.chainId || this.settings.blockchain.homeChain.chainId)
    );
    const fcds = await FCD.find({ chainId: chainId }).sort({ dataTimestamp: -1 }).exec();
    response.send(fcds);
  };
}

export default FcdsController;
