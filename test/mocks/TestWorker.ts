import { injectable } from 'inversify';
import BasicWorker from '../../src/workers/BasicWorker';
import Bull from 'bullmq';

@injectable()
export class TestWorker extends BasicWorker {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  apply = async (job: Bull.Job): Promise<void> => {}
}
