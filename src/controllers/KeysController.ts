import { inject, injectable } from 'inversify';
import express, { Request, Response } from 'express';
import { loadFeeds } from '@umb-network/toolbox';
import Settings from '../types/Settings';

import LeafRepository from '../repositories/LeafRepository';

@injectable()
class KeysController {
  @inject(LeafRepository) leafRepository!: LeafRepository;
  router: express.Application;

  constructor(@inject('Settings') private readonly settings: Settings) {
    this.router = express().get('/fcds', this.fcds).get('/layer2', this.layer2keys);
  }

  fcds = async (request: Request, response: Response): Promise<void> => {
    try {
      const keys = await loadFeeds(this.settings.app.feedsOnChain);
      response.send([...Object.keys(keys)]);
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
