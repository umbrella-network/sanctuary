import { inject, injectable } from 'inversify';
import express, { Request, Response } from 'express';
import { AuthenticationMiddleware } from '../middleware/AuthenticationMiddleware';
import { MetricsRepository } from '../repositories/MetricsRepository';
import { getDateAtMidnight } from '../utils/time';
import isValid from 'date-fns/isValid';

@injectable()
class MetricsController {
  @inject(MetricsRepository) metricsRepository!: MetricsRepository;
  router: express.Router;

  constructor(@inject(AuthenticationMiddleware) authenticationMiddleware: AuthenticationMiddleware) {
    this.router = express.Router().use(authenticationMiddleware.restrictAccess).get('/voters', this.getVotersCount);
  }

  private getVotersCount = async (request: Request, response: Response): Promise<void> => {
    const { startDate, endDate } = <{ startDate: string; endDate: string }>request.query;

    if (!isValid(new Date(startDate)) || !isValid(new Date(endDate))) {
      response.status(400).end();
      return;
    }

    const startDateFormat = getDateAtMidnight(startDate);
    const endDateFormat = getDateAtMidnight(endDate);

    const votersCount = await this.metricsRepository.getVotersCount({
      startDate: startDateFormat,
      endDate: endDateFormat,
    });

    response.send(votersCount);
  };
}

export default MetricsController;
