import { inject, injectable } from 'inversify';
import express, { Request, Response } from 'express';
import FCD, { IFCD } from '../models/FCD';
import Settings from '../types/Settings';
import { loadFeeds } from '@umb-network/toolbox';
import Feeds from '@umb-network/toolbox/dist/types/Feed';
import { Logger } from 'winston';
import { Document } from 'mongoose';

interface IFCDResponse extends Omit<IFCD, keyof Document> {
  active: boolean;
}

@injectable()
class FcdsController {
  @inject('Settings') private readonly settings: Settings;
  @inject('Logger') private readonly logger: Logger;

  router: express.Application;

  constructor() {
    this.router = express().get('/', this.index).get('/:chainId', this.index);
  }

  index = async (request: Request, response: Response): Promise<void> => {
    const chainId = <string>(
      (request.query.chainId || request.params.chainId || this.settings.blockchain.homeChain.chainId)
    );

    const fcds = await FCD.find({ chainId: chainId })
      .sort({ dataTimestamp: -1 })
      .exec()
      .then((fcds) => this.setActiveFlag(fcds));

    response.send(fcds);
  };

  private setActiveFlag = async (fcds: IFCD[]): Promise<IFCDResponse[]> => {
    let fcdFeeds: Feeds;

    try {
      fcdFeeds = await loadFeeds(this.settings.app.feedsOnChain);
    } catch (err) {
      this.logger.error(`Error while Loading FCDs: ${err}`);
    }

    return fcds.map(({ key, value, dataTimestamp, chainId }) => ({
      key,
      value,
      dataTimestamp,
      chainId,
      active: fcdFeeds ? Object.keys(fcdFeeds).includes(key) : true,
    }));
  };
}

export default FcdsController;
