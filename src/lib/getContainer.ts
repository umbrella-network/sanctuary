import { Container } from 'inversify';
import Settings from '../types/Settings';
import settings from '../config/settings';
import { Redis } from 'ioredis';
import buildRedisConnection from '../utils/buildRedisConnection';
import { Logger } from 'winston';
import StatsdClient from 'statsd-client';
import { Blockchain } from './Blockchain';
import { AuthUtils } from '../services/AuthUtils';
import LockRepository from '../repositories/LockRepository';
import { BlockchainRepository } from '../repositories/BlockchainRepository';
import { ChainContractRepository } from '../repositories/ChainContractRepository';
import { ManagementClient } from 'auth0';
import { initAuth0ManagementClient } from '../config/initAuth0ManagementClient';
import { getStatsdClient } from './getStatsdClient';
import { getLogger } from './getLogger';

export function getContainer(): Container {
  const container = new Container({ autoBindInjectable: true });

  container
    .bind<Settings>('Settings')
    .toDynamicValue(() => settings)
    .inSingletonScope();

  container
    .bind<Logger>('Logger')
    .toDynamicValue(() => getLogger())
    .inSingletonScope();

  container
    .bind<Redis>('Redis')
    .toDynamicValue((ctx) => buildRedisConnection(ctx.container.get<Settings>('Settings').redis))
    .inSingletonScope();

  container
    .bind<StatsdClient>('StatsdClient')
    .toDynamicValue(() => getStatsdClient())
    .inSingletonScope();

  container
    .bind<ManagementClient>('Auth0ManagementClient')
    .toDynamicValue((ctx) => initAuth0ManagementClient(ctx.container.get('Settings')))
    .inSingletonScope();

  container.bind<Blockchain>(Blockchain).toSelf().inSingletonScope();
  container.bind<AuthUtils>(AuthUtils).toSelf().inSingletonScope();
  container.bind(LockRepository).toSelf().inSingletonScope();
  container.bind(BlockchainRepository).toSelf().inSingletonScope();
  container.bind(ChainContractRepository).toSelf().inSingletonScope();
  return container;
}
