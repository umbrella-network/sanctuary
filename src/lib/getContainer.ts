import { Container } from 'inversify';
import { Redis } from 'ioredis';
import { Logger } from 'winston';
import { ManagementClient } from 'auth0';
import Settings from '../types/Settings';
import settings from '../config/settings';
import buildRedisConnection from '../utils/buildRedisConnection';
import { Blockchain } from './Blockchain';
import { ProjectAuthUtils } from '../services/ProjectAuthUtils';
import LockRepository from '../repositories/LockRepository';
import { BlockchainRepository } from '../repositories/BlockchainRepository';
import { ChainContractRepository } from '../repositories/ChainContractRepository';
import { initAuth0ManagementClient } from '../config/initAuth0ManagementClient';
import { getLogger } from './getLogger';
import { BlockchainScanner } from './BlockchainScanner';
import { BlockchainScannerRepository } from '../repositories/BlockchainScannerRepository';
import { ContractSynchronizer } from '../services/ContractSynchronizer';
import ChainSynchronizer from '../services/ChainSynchronizer';
import { RegisteredContractRepository } from '../repositories/RegisteredContractRepository';
import { BaseTxReceiptFetcher } from '../services/on-chain-stats/BaseTxReceiptFetcher';
import { TxReceiptFetcher } from '../services/on-chain-stats/TxReceiptFetcher';
import { UpdateTxRepository } from '../repositories/UpdateTxRepository';
import { GasCalculatorEvm } from '../services/on-chain-stats/GasCalculatorEvm';
import { GasCalculator } from '../services/on-chain-stats/GasCalculator';
import { KeysUpdateService } from '../services/on-chain-stats/KeysUpdateService';
import { FeedKeyRepository } from '../repositories/FeedKeyRepository';
import { ScanningTimeLeft } from '../services/on-chain-stats/ScanningTimeLeft';

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
    .bind<ManagementClient>('Auth0ManagementClient')
    .toDynamicValue((ctx) => initAuth0ManagementClient(ctx.container.get('Settings')))
    .inSingletonScope();

  container.bind<Blockchain>(Blockchain).toSelf().inSingletonScope();
  container.bind<BlockchainScanner>(BlockchainScanner).toSelf().inSingletonScope();
  container.bind<ProjectAuthUtils>(ProjectAuthUtils).toSelf().inSingletonScope();
  container.bind(LockRepository).toSelf().inSingletonScope();
  container.bind(BlockchainRepository).toSelf().inSingletonScope();
  container.bind(BlockchainScannerRepository).toSelf().inSingletonScope();
  container.bind(ContractSynchronizer).toSelf().inSingletonScope();
  container.bind(ChainSynchronizer).toSelf().inSingletonScope();
  container.bind(ChainContractRepository).toSelf().inSingletonScope();
  container.bind(RegisteredContractRepository).toSelf().inSingletonScope();
  container.bind(BaseTxReceiptFetcher).toSelf().inSingletonScope();
  container.bind(TxReceiptFetcher).toSelf().inSingletonScope();
  container.bind(UpdateTxRepository).toSelf().inSingletonScope();
  container.bind(GasCalculatorEvm).toSelf().inSingletonScope();
  container.bind(GasCalculator).toSelf().inSingletonScope();
  container.bind(KeysUpdateService).toSelf().inSingletonScope();
  container.bind(FeedKeyRepository).toSelf().inSingletonScope();
  container.bind(ScanningTimeLeft).toSelf().inSingletonScope();
  return container;
}
