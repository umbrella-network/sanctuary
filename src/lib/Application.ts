import { Container, interfaces } from 'inversify';
import { Logger } from 'winston';
import IORedis from 'ioredis';
import settings from '../config/settings';
import logger from './logger';
import Settings from '../types/Settings';
import { Blockchain } from './Blockchain';
import { AuthUtils } from '../services/AuthUtils';
import LockRepository from '../repositories/LockRepository';
import buildRedisConnection from '../utils/buildRedisConnection';
import StatsdClient from 'statsd-client';
import statsdClient from './statsDClient';
import { BlockchainRepository } from '../repositories/BlockchainRepository';
import { ChainContractRepository } from '../repositories/ChainContractRepository';
import { ManagementClient } from 'auth0';
import { initAuth0ManagementClient } from '../config/initAuth0ManagementClient';

class Application {
  private static _instance: Application;
  private container: Container;

  private constructor() {
    this.container = new Container({ autoBindInjectable: true });
    this.container.bind<Settings>('Settings').toConstantValue(settings);
    this.container.bind<Logger>('Logger').toConstantValue(logger);
    this.container.bind<IORedis.Redis>('Redis').toConstantValue(buildRedisConnection(settings.redis));
    this.container.bind<StatsdClient>('StatsdClient').toConstantValue(statsdClient);
    this.container.bind<Blockchain>(Blockchain).toSelf().inSingletonScope();
    this.container.bind<AuthUtils>(AuthUtils).toSelf().inSingletonScope();
    this.container.bind(LockRepository).toSelf().inSingletonScope();
    this.container.bind(BlockchainRepository).toSelf().inSingletonScope();
    this.container.bind(ChainContractRepository).toSelf().inSingletonScope();

    this
      .container
      .bind<ManagementClient>('Auth0ManagementClient')
      .toDynamicValue((ctx) => initAuth0ManagementClient(ctx.container.get('Settings')))
      .inSingletonScope();
  }

  public static get instance(): Application {
    return (this._instance ||= new Application());
  }

  public static get<T>(serviceIdentifier: interfaces.ServiceIdentifier<T>): T {
    return Application.instance.container.get(serviceIdentifier);
  }
}

export default Application;
