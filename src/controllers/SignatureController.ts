import { inject, injectable } from 'inversify';
import express, { Request, Response } from 'express';
import isValid from 'date-fns/isValid';
import { subHours } from 'date-fns';

import { MetricsQueries } from '../queries/MetricsQueries';
import { TCount } from '../types/analytics/Metrics';
import { BlockRepository, CountBlocksBetweenProps as Period } from '../repositories/BlockRepository';
import { SignatureRate } from '../types/SignatureRate';

@injectable()
class SignatureController {
  @inject(MetricsQueries) metricsQueries!: MetricsQueries;
  @inject(BlockRepository) blockRepository!: BlockRepository;
  router: express.Router;

  constructor() {
    this.router = express.Router().get('/', this.getSignatureCount);
  }

  private getSignatureCount = async (request: Request, response: Response): Promise<void> => {
    const period = this.getDateOrDefault(<Period<string>>request.query);

    const amountOfBlocks = await this.blockRepository.countBlocksFromPeriod(period);
    const voters = await this.metricsQueries.getVotersCount(period);
    const signatureRate = this.countSignatureRate(voters, amountOfBlocks);

    response.send(signatureRate);
  };

  private getDateOrDefault = ({ startDate, endDate }: Period<string>): Period<Date> => {
    const end = isValid(new Date(endDate)) ? new Date(endDate) : new Date();
    const start = isValid(new Date(startDate)) ? new Date(startDate) : subHours(end, 1);

    return {
      startDate: start,
      endDate: end,
    };
  };

  private countSignatureRate = (voters: TCount[], numberOfBlocks: number): SignatureRate[] => {
    return voters.map(({ _id, count }) => ({
      _id,
      participationRate: this.getRateInDecimal(count, numberOfBlocks),
    }));
  };

  private getRateInDecimal = (signatures: number, blocks: number): number => {
    const averageParticipationPerBlock = signatures / blocks;
    const roundedRate = Math.round(averageParticipationPerBlock * 10000) / 100;
    return roundedRate;
  };
}

export default SignatureController;
