import { Logger } from 'winston';
import { ABI, ContractRegistry } from '@umb-network/toolbox';
import { inject, injectable } from 'inversify';
import { Contract, Event } from 'ethers';

import { LogRegistered } from '../types/events';
import { CreateBatchRanges } from './CreateBatchRanges';
import { ChainsIds } from '../types/ChainsIds';
import { MappingRepository } from '../repositories/MappingRepository';
import { LAST_BLOCK_CHECKED_FOR_NEW_CONTRACT } from '../constants/mappings';
import RegisteredContracts, { IRegisteredContracts } from '../models/RegisteredContracts';
import { BlockchainScannerRepository } from '../repositories/BlockchainScannerRepository';
import { RegisteredContractRepository } from '../repositories/RegisteredContractRepository';
import { ScanningTimeLeft } from './on-chain-stats/ScanningTimeLeft';

type FreshContracts = {
  name: string;
  fresh: boolean;
  address: string;
};

@injectable()
export class ContractSynchronizer {
  @inject('Logger') private logger!: Logger;
  @inject(BlockchainScannerRepository) private blockchainScannerRepository!: BlockchainScannerRepository;
  @inject(MappingRepository) private mappingRepository: MappingRepository;
  @inject(RegisteredContractRepository) private contractRepository: RegisteredContractRepository;
  @inject(ScanningTimeLeft) private timeLeft: ScanningTimeLeft;

  apply = async (chainId: ChainsIds, contracts: string[]): Promise<{ lastSyncedBlock: number }> => {
    let lastSyncedBlock = -1;

    if (chainId === ChainsIds.SOLANA) {
      return { lastSyncedBlock };
    }

    const blockchainScanner = this.blockchainScannerRepository.get(chainId);

    if (!blockchainScanner.settings.startBlockNumber) {
      this.logger.debug(`[ContractSynchronizer][${chainId}] startBlockNumber not set`);
      return { lastSyncedBlock };
    }

    const blockNumber = await blockchainScanner.getBlockNumber();
    const lastCheckedBlock = await this.mappingRepository.get(LAST_BLOCK_CHECKED_FOR_NEW_CONTRACT(chainId));

    if (!this.readyForFullBatch(chainId, blockNumber, lastCheckedBlock, blockchainScanner.settings.scanBatchSize)) {
      this.logger.debug(`[ContractSynchronizer][${chainId}] not ready for full batch`);
      lastSyncedBlock = lastCheckedBlock ? parseInt(lastCheckedBlock, 10) : blockchainScanner.settings.startBlockNumber;
      return { lastSyncedBlock };
    }

    const upToDate = await this.contractsUpToDate(chainId, contracts);

    if (upToDate.upToDate) {
      lastSyncedBlock = blockNumber - blockchainScanner.settings.confirmations;
      await this.mappingRepository.set(LAST_BLOCK_CHECKED_FOR_NEW_CONTRACT(chainId), lastSyncedBlock.toString(10));
      this.logger.info(`[ContractSynchronizer][${chainId}] contracts up to date.`);
      return { lastSyncedBlock };
    }

    this.logger.info(`[ContractSynchronizer][${chainId}] contracts not up to date.`);
    lastSyncedBlock = await this.synchronizeContracts(chainId, blockNumber, contracts);

    await this.mappingRepository.set(LAST_BLOCK_CHECKED_FOR_NEW_CONTRACT(chainId), lastSyncedBlock.toString(10));

    if (!(await this.contractRepository.getLastSavedAnchor())) {
      await this.saveInitialContracts(chainId, upToDate.list, blockchainScanner.settings.startBlockNumber);
    }

    return { lastSyncedBlock };
  };

  private contractsUpToDate = async (
    chainId: string,
    contracts: string[]
  ): Promise<{ upToDate: boolean; list: FreshContracts[] }> => {
    const upToDate = await Promise.all(contracts.map((contractName) => this.contractUpToDate(chainId, contractName)));

    return {
      upToDate: upToDate.every((value) => value.fresh),
      list: upToDate,
    };
  };

  private contractUpToDate = async (chainId: string, contractName: string): Promise<FreshContracts> => {
    this.logger.debug(`[ContractSynchronizer][${chainId}] checking if ${contractName} up to date.`);
    const blockchain = this.blockchainScannerRepository.get(chainId);
    const registry = new ContractRegistry(blockchain.getProvider(), blockchain.getContractRegistryAddress());

    let currentAddress;

    try {
      currentAddress = await registry.getAddress(contractName);
    } catch (e) {
      this.logger.error(
        `[ContractSynchronizer][${chainId}] unable to get address for ${contractName}. Trying provider again`
      );
      currentAddress = await registry.getAddress(contractName);
    }

    const id = this.contractRepository.instanceId(chainId, contractName, currentAddress);
    const results = await RegisteredContracts.findById(id);

    if (results) {
      this.logger.debug(`[${chainId}] ${contractName} ${results.address}, at anchor ${results.anchor}`);
    }

    return { fresh: !!results, address: currentAddress, name: contractName };
  };

  private synchronizeContracts = async (
    chainId: ChainsIds,
    currentBlockNumber: number,
    contracts: string[]
  ): Promise<number> => {
    const blockchainScanner = this.blockchainScannerRepository.get(chainId);

    const [fromBlock, toBlock] = await this.calculateBlockNumberRange(
      chainId,
      blockchainScanner.settings.startBlockNumber,
      currentBlockNumber,
      blockchainScanner.settings.confirmations
    );

    this.logger.info(
      `[ContractSynchronizer][${chainId}] synchronizing contracts @${currentBlockNumber}: ${fromBlock} - ${toBlock}`
    );

    const ranges = CreateBatchRanges.apply(fromBlock, toBlock, blockchainScanner.settings.scanBatchSize);
    const timeStart = Date.now();
    let lastScannedBlock = fromBlock;

    const roundsBatch = 10;
    const rounds = ranges.length / roundsBatch;

    // it might be faster to do async, but it is easier to manage with time limit
    for (let i = 0; i < rounds && this.timeLeft.call(timeStart, 0.1) > 0; i++) {
      await Promise.all(
        ranges.slice(i * roundsBatch, roundsBatch * (i + 1)).map(([batchFrom, batchTo]) => {
          this.synchronizeContractsForBatch(chainId, batchFrom, batchTo, contracts);
          lastScannedBlock = batchTo;
        })
      );
    }

    return lastScannedBlock;
  };

  private synchronizeContractsForBatch = async (
    chainId: ChainsIds,
    fromBlock: number,
    toBlock: number,
    contracts: string[]
  ): Promise<IRegisteredContracts[]> => {
    if (fromBlock > toBlock)
      throw new Error(`[ContractSynchronizer][${chainId} fromBlock ${fromBlock} > toBlock ${toBlock}`);

    const events = await this.scanForEvents(chainId, fromBlock, toBlock, contracts);

    this.logger.info(`[ContractSynchronizer][${chainId}] got ${events.length} events for ${fromBlock}-${toBlock}`);

    return Promise.all(
      events.map((logRegistered) => {
        const { destination, anchor, bytes32 } = logRegistered;
        const [name] = Buffer.from(bytes32.replace('0x', ''), 'hex').toString().split(']x00');
        this.logger.info(`[ContractSynchronizer][${chainId}] Detected new ${name}: ${destination} at ${anchor}`);
        return this.contractRepository.save(chainId, anchor, name, destination);
      })
    );
  };

  private calculateBlockNumberRange = async (
    chainId: ChainsIds,
    startBlockNumber: number,
    endBlockNumber: number,
    confirmations: number
  ): Promise<[number, number]> => {
    const prefix = `[ContractSynchronizer][${chainId}] `;

    const [lastCheckBlockCached, lastSavedAnchor] = await Promise.all([
      this.mappingRepository.get(LAST_BLOCK_CHECKED_FOR_NEW_CONTRACT(chainId)),
      this.contractRepository.getLastSavedAnchor(),
    ]);

    let lastAnchor = lastCheckBlockCached
      ? Math.max(lastSavedAnchor ?? -1, parseInt(lastCheckBlockCached, 10))
      : lastSavedAnchor;

    lastAnchor -= confirmations;

    if (lastAnchor > endBlockNumber) {
      this.logger.warn(
        `${prefix}lastAnchor > endBlockNumber (${lastAnchor} > ${endBlockNumber}), are we switching blockchains?`
      );

      if (startBlockNumber < 0 || startBlockNumber > endBlockNumber) {
        throw Error(
          `${prefix} block mishmash: startBlockNumber: ${startBlockNumber}, endBlockNumber: ${endBlockNumber}`
        );
      }

      return [startBlockNumber, endBlockNumber];
    }

    const lookBack = Math.max(0, startBlockNumber < 0 ? endBlockNumber + startBlockNumber : startBlockNumber);
    const fromBlock = lastAnchor > 0 ? lastAnchor : lookBack;
    return [fromBlock + 1, endBlockNumber];
  };

  private readyForFullBatch = (
    chainId: ChainsIds,
    currentBlockNumber: number,
    lastCheckedBlock: string | undefined,
    batchSize: number
  ): boolean => {
    return lastCheckedBlock ? currentBlockNumber - parseInt(lastCheckedBlock, 10) > batchSize : true;
  };

  private scanForEvents = async (
    chainId: ChainsIds,
    fromBlock: number,
    toBlock: number,
    contracts: string[]
  ): Promise<LogRegistered[]> => {
    const blockchain = this.blockchainScannerRepository.get(chainId);

    this.logger.info(`[ContractSynchronizer][${chainId}] Checking for new contracts ${fromBlock} - ${toBlock}`);
    // event LogRegistered(address indexed destination, bytes32 name);
    const registry: Contract = new Contract(
      blockchain.getContractRegistryAddress(),
      ABI.registryAbi,
      blockchain.getProvider()
    );

    const filter = registry.filters.LogRegistered();
    return this.filterContractEvents(await registry.queryFilter(filter, fromBlock, toBlock), contracts);
  };

  private filterContractEvents(events: Event[], contracts: string[]): LogRegistered[] {
    const bytes32Names = contracts.map((c) => Buffer.from(c).toString('hex')).map((x) => `0x${x.padEnd(64, '0')}`);

    return events
      .map(ContractSynchronizer.toLogRegistered)
      .filter((logRegistered) => bytes32Names.includes(logRegistered.bytes32));
  }

  private async saveInitialContracts(
    chainId: ChainsIds,
    upToDate: FreshContracts[],
    registryScannerStartingBlock: number
  ): Promise<void> {
    await Promise.all(
      upToDate
        .filter((data) => !data.fresh)
        .map((contractData) => {
          this.logger.info(
            `[ContractSynchronizer][${chainId}] saving initial contract ${contractData.name}@${contractData.address}`
          );

          return this.contractRepository.save(
            chainId,
            registryScannerStartingBlock,
            contractData.name,
            contractData.address
          );
        })
    );
  }

  private static toLogRegistered(event: Event): LogRegistered {
    return {
      destination: event.args[0],
      bytes32: event.args[1],
      anchor: event.blockNumber,
    };
  }
}
