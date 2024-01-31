import Bull from 'bullmq';
import { Logger } from 'winston';
import { inject, injectable } from 'inversify';

import BasicWorker from './BasicWorker';

@injectable()
class MetricsWorker extends BasicWorker {
  @inject('Logger') logger!: Logger;

  apply = async (job: Bull.Job): Promise<void> => {
    try {
      this.logger.debug(`[MetricsWorker] apply for ${job.id}`);
    } catch (e) {
      this.logger.error(e);
    }
  };
}

export default MetricsWorker;
