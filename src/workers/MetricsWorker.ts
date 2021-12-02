import Bull from 'bullmq';
import { Logger } from 'winston';
import { inject, injectable } from 'inversify';

import BlockMintedReporter from '../services/BlockMintedReporter';
import BlockLeafCountReporter from '../services/BlockLeafCountReporter';
import BasicWorker from './BasicWorker';
import { ChainsIds } from '../types/ChainsIds';
import HomechainBalanceReporter from '../services/HomechainBalanceReporter';
import ForeignChainBalanceReporter from '../services/ForeignChainBalanceReporter';

@injectable()
class MetricsWorker extends BasicWorker {
  @inject('Logger') logger!: Logger;
  @inject(BlockMintedReporter) blockMintedReporter!: BlockMintedReporter;
  @inject(BlockLeafCountReporter) blockLeafCountReporter!: BlockLeafCountReporter;
  @inject(HomechainBalanceReporter) homechainBalanceReporter!: HomechainBalanceReporter;
  @inject(ForeignChainBalanceReporter) foreignChainBalanceReporter!: ForeignChainBalanceReporter;

  apply = async (job: Bull.Job): Promise<void> => {
    try {
      this.logger.debug(`Sending metrics to NewRelic ${job.data}`);
      await this.blockMintedReporter.call(ChainsIds.BSC);
      await this.blockMintedReporter.call(ChainsIds.ETH);
      await this.blockLeafCountReporter.call();

      await this.homechainBalanceReporter.call();
      await this.foreignChainBalanceReporter.call([ChainsIds.ETH, ChainsIds.POLYGON, ChainsIds.AVALANCHE]);
    } catch (e) {
      this.logger.error(e);
    }
  };
}

export default MetricsWorker;
