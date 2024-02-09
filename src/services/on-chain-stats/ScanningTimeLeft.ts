import { inject, injectable } from 'inversify';
import Settings from '../../types/Settings';

@injectable()
export class ScanningTimeLeft {
  @inject('Settings') private settings!: Settings;

  call(timeStart: number, period = 0.75): number {
    const maxExecutionTime = this.settings.jobs.metricsReporting.interval * period;
    return Math.trunc((maxExecutionTime - (Date.now() - timeStart)) / 1000);
  }
}
