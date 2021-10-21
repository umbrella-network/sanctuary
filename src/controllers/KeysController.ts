import { inject, injectable } from 'inversify';
import express, { Request, Response } from 'express';
import Settings from '../types/Settings';

import { FCDRepository } from '../repositories/FCDRepository';
import LeafRepository from '../repositories/LeafRepository';

@injectable()
class KeysController {
  @inject(FCDRepository) fcdRepository!: FCDRepository;
  @inject(LeafRepository) leafRepository!: LeafRepository;
  router: express.Application;

  constructor(@inject('Settings') private readonly settings: Settings) {
    this.router = express().get('/fcds', this.fcds).get('/layer2', this.layer2keys);
  }

  fcds = async (request: Request, response: Response): Promise<void> => {
    try {
      const keys = await this.fcdRepository.findUniqueKeys();
      response.send(keys);
    } catch (err) {
      response.sendStatus(500);
    }
  };

  layer2keys = async (request: Request, response: Response): Promise<void> => {
    try {
      const keys = await this.leafRepository.getKeys();
      response.send(keys);
    } catch (err) {
      response.sendStatus(500);
    }
  };
}

export default KeysController;
