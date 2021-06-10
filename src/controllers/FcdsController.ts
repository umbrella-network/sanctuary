import { inject, injectable } from 'inversify';
import express, { Request, Response } from 'express';
import { AuthUtils } from '../services/AuthUtils';
import FCD from '../models/FCD';

@injectable()
class FcdsController {
  router: express.Application;

  constructor(@inject(AuthUtils) private readonly authUtils: AuthUtils) {
    this.router = express().get('/', this.index);
  }

  index = async (request: Request, response: Response): Promise<void> => {
    const fcds = await FCD.find({}).sort({ dataTimestamp: -1 }).exec();
    response.send(fcds);
  };
}

export default FcdsController;
