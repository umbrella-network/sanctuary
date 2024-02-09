import { inject, injectable } from 'inversify';
import Settings from '../../types/Settings';

@injectable()
export class ScanningTimeLeft {
  @inject('Settings') private settings!: Settings;

  call(timeStart: number): number {
    const maxExecutionTime = (this.settings.jobs.metricsReporting.interval * 3) / 4;
    return Math.trunc((maxExecutionTime - (Date.now() - timeStart)) / 1000);
  }
}
