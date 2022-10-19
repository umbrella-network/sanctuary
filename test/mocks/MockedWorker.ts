/* eslint-disable */
import BasicWorker from '../../src/workers/BasicWorker';

export class MockedWorker extends BasicWorker {
  apply = async (): Promise<void> => Promise.resolve();
  pause = async (): Promise<void> => await this.worker.pause();
  resume = async (): Promise<void> => await this.worker.resume();
  close = async (): Promise<void> => {
    await this.worker.close(true);
    await this.connection.disconnect();
  };
}
