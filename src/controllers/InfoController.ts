import { inject, injectable } from 'inversify';
import express, { Request, Response } from 'express';
import { InfoRepository } from '../repositories/InfoRepository';
import Settings from '../types/Settings';

@injectable()
class InfoController {
  @inject(InfoRepository) infoRepository: InfoRepository;
  router: express.Router;

  @inject('Settings')
  private settings: Settings;

  constructor() {
    this.router = express.Router().get('/', this.index);
  }

  index = async (request: Request, response: Response): Promise<void> => {
    const chainId = this.resolveChainId(request);
    const info = await this.infoRepository.getInfo({ chainId });
    response.send(info);
  };

  private resolveChainId = (request: Request): string => {
    return <string>request.query.chainId || this.settings.blockchain.homeChain.chainId;
  };
}

export default InfoController;
