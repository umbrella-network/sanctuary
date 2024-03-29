import Bull, { Queue, Worker } from 'bullmq';
import { inject, injectable } from 'inversify';
import IORedis from 'ioredis';
import { Logger } from 'winston';
import { ForeignChainsIds, TForeignChainsIds } from '../types/ChainsIds';
import Settings from '../types/Settings';

@injectable()
abstract class BasicWorker {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  connection: IORedis.Redis;
  #queueName!: string;
  #queue!: Bull.Queue;
  #worker!: Bull.Worker;

  abstract apply(job: Bull.Job): Promise<void>;

  constructor(@inject('Redis') connection: IORedis.Redis) {
    this.connection = connection;
  }

  get queueName(): string {
    return (this.#queueName ||= this.constructor.name);
  }

  get queue(): Bull.Queue {
    return (this.#queue ||= new Queue(this.queueName, {
      connection: {
        host: this.connection.options.host,
        port: this.connection.options.port,
      },
    }));
  }

  get concurrency(): number {
    let workersCount = Object.keys(this.settings.jobs.chainsWorkerSchedulerSettings).length;
    workersCount += Object.keys(this.settings.blockchain.multiChains).filter(
      (chainId) => !ForeignChainsIds.includes(chainId as TForeignChainsIds)
    ).length;
    workersCount += 2; // MetricsWorker + SynchWorker
    console.log('workersCount: ', workersCount);
    return workersCount;
  }

  get worker(): Bull.Worker {
    return (this.#worker ||= new Worker(this.queueName, this.apply, {
      connection: {
        host: this.connection.options.host,
        port: this.connection.options.port,
      },
      concurrency: this.concurrency,
    }));
  }

  enqueue = async <T>(params: T, opts?: Bull.JobsOptions): Promise<Bull.Job<T>> => {
    const jobOptions = {
      removeOnComplete: 100,
      removeOnFail: 100,
      stackTraceLimit: 100,
      ...opts,
    };

    return this.queue.add(this.queueName, params, jobOptions);
  };

  start = (): void => {
    process.on('SIGTERM', this.shutdown);
    process.on('SIGINT', this.shutdown);
    this.worker;
  };

  private shutdown = async () => {
    await this.worker.close(true);
    process.exit(0);
  };
}

export default BasicWorker;
