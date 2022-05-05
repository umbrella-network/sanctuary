import { inject, injectable } from 'inversify';
import express, { Request, Response } from 'express';
import { RestrictedMiddleware } from '../middleware/RestrictedMiddleware';
import { MetricsQueries } from '../queries/MetricsQueries';
import { getDateAtMidnight } from '../utils/time';
import isValid from 'date-fns/isValid';
import { BlockRepository } from '../repositories/BlockRepository';

@injectable()
class MetricsController {
  @inject(MetricsQueries) metricsQueries!: MetricsQueries;
  @inject(BlockRepository) blockRepository!: BlockRepository;
  router: express.Router;

  constructor(@inject(RestrictedMiddleware) restrictedMiddleware: RestrictedMiddleware) {
    this.router = express
      .Router()
      .use(restrictedMiddleware.apply)
      .get('/voters', this.getVotersCount)
      .get('/keys-frequency', this.getKeysFrequencies);
  }

  private getVotersCount = async (request: Request, response: Response): Promise<void> => {
    const { startDate, endDate } = <{ startDate: string; endDate: string }>request.query;

    if (!isValid(new Date(startDate)) || !isValid(new Date(endDate))) {
      response.status(400).end();
      return;
    }

    const startDateFormat = getDateAtMidnight(startDate);
    const endDateFormat = getDateAtMidnight(endDate);

    const votersCount = await this.metricsQueries.getVotersCount({
      startDate: startDateFormat,
      endDate: endDateFormat,
    });

    response.send(votersCount);
  };

  private getKeysFrequencies = async (request: Request, response: Response): Promise<void> => {
    const latestBlock = await this.blockRepository.getLatestBlock();

    const numberOfBlocks = 99;
    const startBlockNumber = latestBlock.blockId - numberOfBlocks;

    const keysFrequencies = await this.metricsQueries.getKeysCount(startBlockNumber, latestBlock.blockId);

    response.send(keysFrequencies);
  };
}

export default MetricsController;
