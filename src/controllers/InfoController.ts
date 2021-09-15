import { inject, injectable } from 'inversify';
import express, { Request, Response } from 'express';
import { InfoRepository } from '../repositories/InfoRepository';

@injectable()
class InfoController {
  @inject(InfoRepository) infoRepository: InfoRepository;
  router: express.Router;

  constructor() {
    this.router = express.Router().get('/', this.index);
  }

  index = async (request: Request, response: Response): Promise<void> => {
    const chainId = <string> request.query.chainId;
    const info = await this.infoRepository.getInfo({ chainId });
    response.send(info);
  };
}

export default InfoController;
