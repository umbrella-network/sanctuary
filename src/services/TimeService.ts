export class TimeService {
  static now(): number {
    return Math.floor(Date.now() / 1000);
  }

  static msTos(timeInMs: number): number {
    return Math.floor(timeInMs / 1000);
  }
}
