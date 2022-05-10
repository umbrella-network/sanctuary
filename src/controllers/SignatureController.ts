import { inject, injectable } from 'inversify';
import express, { Request, Response } from 'express';

import { MetricsQueries } from '../queries/MetricsQueries';
import { BlockRepository, CountBlocksBetweenProps as Period } from '../repositories/BlockRepository';
import { getDateOrDefault } from '../utils/time';
import { countSignatureRate } from '../utils/countSignatureRate';

@injectable()
class SignatureController {
  @inject(MetricsQueries) metricsQueries!: MetricsQueries;
  @inject(BlockRepository) blockRepository!: BlockRepository;
  router: express.Router;

  constructor() {
    this.router = express.Router().get('/', this.getSignatureCount);
  }

  private getSignatureCount = async (request: Request, response: Response): Promise<void> => {
    const period = getDateOrDefault(<Period<string>>request.query);

    const [amountOfBlocks, voters] = await Promise.all([
      this.blockRepository.countBlocksFromPeriod(period),
      this.metricsQueries.getVotersCount(period),
    ]);

    const signatureRate = countSignatureRate(voters, amountOfBlocks);

    response.send(signatureRate);
  };
}

export default SignatureController;
