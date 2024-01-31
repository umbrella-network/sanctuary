import Bull from 'bullmq';
import { Logger } from 'winston';
import { inject, injectable } from 'inversify';

import BlockMintedReporter from '../services/BlockMintedReporter';
import BlockLeafCountReporter from '../services/BlockLeafCountReporter';
import BasicWorker from './BasicWorker';
import { ChainsIds } from '../types/ChainsIds';

@injectable()
class MetricsWorker extends BasicWorker {
  @inject('Logger') logger!: Logger;
  @inject(BlockMintedReporter) blockMintedReporter!: BlockMintedReporter;
  @inject(BlockLeafCountReporter) blockLeafCountReporter!: BlockLeafCountReporter;

  apply = async (job: Bull.Job): Promise<void> => {
    try {
      const chains = Object.values(ChainsIds);
      await Promise.all(chains.map((chainId) => this.blockMintedReporter.call(chainId)));
      await this.blockLeafCountReporter.call();

    } catch (e) {
      this.logger.error(e);
    }
  };
}

export default MetricsWorker;
