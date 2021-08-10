import Bull from 'bullmq';
import { Logger } from 'winston';
import { inject, injectable } from 'inversify';

import BlockMintedReporter from '../services/BlockMintedReporter';
import BlockLeafCountReporter from '../services/BlockLeafCountReporter';
import BasicWorker from './BasicWorker';

@injectable()
class MetricsWorker extends BasicWorker {
  @inject('Logger') logger!: Logger;
  @inject(BlockMintedReporter) blockMintedReporter!: BlockMintedReporter;
  @inject(BlockLeafCountReporter) blockLeafCountReporter!: BlockLeafCountReporter;

  apply = async (job: Bull.Job): Promise<void> => {
    try {
      this.logger.debug(`Sending metrics to NewRelic ${job.data}`);
      await this.blockMintedReporter.call();
      await this.blockLeafCountReporter.call();
    } catch (e) {
      this.logger.error(e);
    }
  };
}

export default MetricsWorker;
