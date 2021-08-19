import { Container, interfaces } from 'inversify';
import { Logger } from 'winston';
import settings from '../config/settings';
import logger from './logger';
import Settings from '../types/Settings';
import Blockchain from './Blockchain';
import ChainContract from '../contracts/ChainContract';
import { AuthUtils } from '../services/AuthUtils';
import LockRepository from '../repositories/LockRepository';
import IORedis from 'ioredis';
import buildRedisConnection from '../utils/buildRedisConnection';

class Application {
  private static _instance: Application;
  private container: Container;

  private constructor() {
    this.container = new Container({ autoBindInjectable: true });
    this.container.bind<Settings>('Settings').toConstantValue(settings);
    this.container.bind<Logger>('Logger').toConstantValue(logger);
    this.container.bind<IORedis.Redis>('Redis').toConstantValue(buildRedisConnection(settings.redis));
    this.container.bind<ChainContract>(ChainContract).toSelf().inSingletonScope();
    this.container.bind<Blockchain>(Blockchain).toSelf().inSingletonScope();
    this.container.bind<AuthUtils>(AuthUtils).toSelf().inSingletonScope();
    this.container.bind(LockRepository).toSelf().inSingletonScope();
  }

  public static get instance(): Application {
    return (this._instance ||= new Application());
  }

  public static get<T>(serviceIdentifier: interfaces.ServiceIdentifier<T>): T {
    return Application.instance.container.get(serviceIdentifier);
  }
}

export default Application;
