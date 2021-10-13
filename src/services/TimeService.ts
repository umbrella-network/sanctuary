export class TimeService {
  static now(): number {
    return Math.floor(Date.now() / 1000);
  }

  static msToSec(timeInMs: number): number {
    return Math.floor(timeInMs / 1000);
  }
}
