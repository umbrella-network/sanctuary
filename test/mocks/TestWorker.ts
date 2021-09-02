import { injectable } from 'inversify';
import BasicWorker from '../../src/workers/BasicWorker';
import Bull from 'bullmq';

@injectable()
export class TestWorker extends BasicWorker {
  apply = async (job: Bull.Job): Promise<void> => {}
}
