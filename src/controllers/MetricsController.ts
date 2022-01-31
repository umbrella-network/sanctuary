import { inject, injectable } from 'inversify';
import express, { Request, Response } from 'express';
import { AuthenticationMiddleware } from '../middleware/AuthenticationMiddleware';
import { MetricsRepository } from '../repositories/MetricsRepository';
import { setDateToZeroTime } from '../utils/time';
import isValid from 'date-fns/isValid';

@injectable()
class MetricsController {
  @inject(MetricsRepository) metricsRepository!: MetricsRepository;
  router: express.Router;

  constructor(@inject(AuthenticationMiddleware) authenticationMiddleware: AuthenticationMiddleware) {
    this.router = express
      .Router()
      .use(authenticationMiddleware.apply)
      .get('/voters/:startDate&:endDate', this.getVotersCount);
  }

  getVotersCount = async (request: Request, response: Response): Promise<void> => {
    const { startDate, endDate } = request.params;

    if (!isValid(new Date(startDate)) || !isValid(new Date(endDate))) {
      response.status(400).end();
    }

    const startDateFormat = setDateToZeroTime(new Date(startDate));
    const endDateFormat = setDateToZeroTime(new Date(endDate));

    const votersCount = await this.metricsRepository.getVotersCount({
      startDate: startDateFormat,
      endDate: endDateFormat,
    });

    response.send(votersCount);
  };
}

export default MetricsController;
