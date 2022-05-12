import { inject, injectable } from 'inversify';
import express, { Request, Response } from 'express';

import settings from '../config/settings';
import { MetricsQueries } from '../queries/MetricsQueries';
import { BlockRepository, CountBlocksBetweenProps as Period } from '../repositories/BlockRepository';
import { createPeriod } from '../utils/period';
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
    try {
      const period = createPeriod(<Period<string>>request.query, settings.signatures);

      const [amountOfBlocks, voters] = await Promise.all([
        this.blockRepository.countBlocksFromPeriod(period),
        this.metricsQueries.getVotersCount(period),
      ]);

      const signatureRate = countSignatureRate(voters, amountOfBlocks);

      response.send(signatureRate);
    } catch (e) {
      response.status(400).send({ error: (<Error>e).message });
    }
  };
}

export default SignatureController;
