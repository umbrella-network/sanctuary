import { Logger } from 'winston';
import { ABI, ContractRegistry } from '@umb-network/toolbox';
import { inject, injectable } from 'inversify';
import { Contract, Event } from 'ethers';
import * as fastq from 'fastq';
import type { queueAsPromised } from 'fastq';

import { LogRegistered } from '../types/events';
import { CreateBatchRanges } from './CreateBatchRanges';
import Settings from '../types/Settings';
import { BlockchainRepository } from '../repositories/BlockchainRepository';
import { ChainsIds } from '../types/ChainsIds';
import { MappingRepository } from '../repositories/MappingRepository';
import { LAST_BLOCK_CHECKED_FOR_NEW_CONTRACT } from '../constants/mappings';
import RegisteredContracts, { IRegisteredContracts } from '../models/RegisteredContracts';

type SyncChainTask = {
  batchFrom: number;
  batchTo: number;
};

type FreshContracts = {
  name: string;
  fresh: boolean;
  address: string;
};

@injectable()
export class ContractSynchronizer {
  @inject('Logger') private logger!: Logger;
  @inject('Settings') private settings: Settings;
  @inject(BlockchainRepository) private blockchainRepository!: BlockchainRepository;
  @inject(MappingRepository) private mappingRepository: MappingRepository;

  apply = async (chainId: ChainsIds, contracts: string[]): Promise<void> => {
    if (chainId === ChainsIds.SOLANA) {
      return;
    }

    const blockchain = this.blockchainRepository.get(chainId);

    if (!blockchain.settings.registryScannerStartingBlock) {
      return;
    }

    const blockNumber = await blockchain.getBlockNumber();

    if (!(await this.readyForFullBatch(chainId, blockNumber, blockchain.settings.scanBatchSize))) {
      this.logger.debug(`[${chainId}] not ready for full batch`);
      return;
    }

    const upToDate = await this.contractsUpToDate(chainId, contracts);

    if (upToDate.upToDate) {
      await this.mappingRepository.set(LAST_BLOCK_CHECKED_FOR_NEW_CONTRACT(chainId), blockNumber.toString(10));
      this.logger.info(`[${chainId}] contracts up to date.`);
      return;
    }

    this.logger.info(`[${chainId}] contracts not up to date.`);
    await this.synchronizeContracts(chainId, blockNumber, contracts);

    if ((await this.getLastSavedAnchor()) < 0) {
      this.logger.info(`[${chainId}] scanning finished but nothing found.`);
      await this.saveInitialContracts(chainId, upToDate.list, blockchain.settings.registryScannerStartingBlock);
    }
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
    this.logger.debug(`[${chainId}] checking if ${contractName} up to date.`);
    const blockchain = this.blockchainRepository.get(chainId);
    const registry = new ContractRegistry(blockchain.getProvider(), blockchain.getContractRegistryAddress());

    let currentAddress;

    try {
      currentAddress = await registry.getAddress(contractName);
    } catch (e) {
      this.logger.info(`[${chainId}] unable to get address for ${contractName}. Trying provider again`);
      currentAddress = await registry.getAddress(contractName);
    }

    const id = ContractSynchronizer.contractInstanceId(chainId, contractName, currentAddress);
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
  ): Promise<void> => {
    const blockchain = this.blockchainRepository.get(chainId);

    const [fromBlock, toBlock] = await this.calculateBlockNumberRange(
      chainId,
      blockchain.settings.registryScannerStartingBlock,
      currentBlockNumber,
      blockchain.settings.confirmations
    );

    this.logger.info(`[${chainId}] Synchronizing contracts @${currentBlockNumber}: ${fromBlock} - ${toBlock}`);

    const ranges = CreateBatchRanges.apply(fromBlock, toBlock, blockchain.settings.scanBatchSize);

    const worker = async (task: SyncChainTask) => {
      await this.synchronizeContractsForBatch(chainId, task.batchFrom, task.batchTo, contracts);
    };

    const queue: queueAsPromised<SyncChainTask> = fastq.promise(worker, blockchain.settings.maxRequestConcurrency);

    ranges.map(([batchFrom, batchTo]) => {
      queue.push({ batchFrom, batchTo });
    });

    await queue.drained();
  };

  private synchronizeContractsForBatch = async (
    chainId: ChainsIds,
    fromBlock: number,
    toBlock: number,
    contracts: string[]
  ): Promise<IRegisteredContracts[]> => {
    if (fromBlock > toBlock) throw new Error(`[ContractSynchronizer] fromBlock ${fromBlock} > toBlock ${toBlock}`);

    const events = await this.scanForEvents(chainId, fromBlock, toBlock, contracts);

    this.logger.info(`[${chainId}] got ${events.length} events for ${fromBlock}-${toBlock}`);

    return Promise.all(
      events.map((logRegistered) => {
        const { destination, anchor, bytes32 } = logRegistered;
        const [name] = Buffer.from(bytes32.replace('0x', ''), 'hex').toString().split(']x00');
        this.logger.info(`[${chainId}] Detected new ${name}: ${destination} at ${anchor}`);

        return RegisteredContracts.findOneAndUpdate(
          {
            _id: ContractSynchronizer.contractInstanceId(chainId, name, destination),
          },
          {
            anchor: anchor,
            address: destination,
            chainId: chainId,
          },
          {
            new: true,
            upsert: true,
          }
        );
      })
    );
  };

  private calculateBlockNumberRange = async (
    chainId: ChainsIds,
    startBlockNumber: number,
    endBlockNumber: number,
    confirmations: number
  ): Promise<[number, number]> => {
    const prefix = `[${chainId}] `;

    const [lastCheckBlockCached, lastSavedAnchor] = await Promise.all([
      this.mappingRepository.get(LAST_BLOCK_CHECKED_FOR_NEW_CONTRACT(chainId)),
      this.getLastSavedAnchor(),
    ]);

    let lastAnchor = lastCheckBlockCached
      ? Math.max(lastSavedAnchor, parseInt(lastCheckBlockCached, 10))
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

  private getLastSavedAnchor = async (): Promise<number> => {
    const records = await RegisteredContracts.find().limit(1).sort({ anchor: -1 }).exec();
    return records[0] ? records[0].anchor : -1;
  };

  private readyForFullBatch = async (
    chainId: ChainsIds,
    currentBlockNumber: number,
    batchSize: number
  ): Promise<boolean> => {
    const lastCheckedBlock = await this.mappingRepository.get(LAST_BLOCK_CHECKED_FOR_NEW_CONTRACT(chainId));
    return lastCheckedBlock ? currentBlockNumber - parseInt(lastCheckedBlock, 10) > batchSize : true;
  };

  private scanForEvents = async (
    chainId: ChainsIds,
    fromBlock: number,
    toBlock: number,
    contracts: string[]
  ): Promise<LogRegistered[]> => {
    const blockchain = this.blockchainRepository.get(chainId);

    this.logger.info(`[${chainId}] Checking for new contracts ${fromBlock} - ${toBlock}`);
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
          this.logger.info(`[${chainId}] saving initial contract ${contractData.name}@${contractData.address}`);

          return RegisteredContracts.findOneAndUpdate(
            {
              _id: ContractSynchronizer.contractInstanceId(chainId, contractData.name, contractData.address),
            },
            {
              anchor: registryScannerStartingBlock,
              address: contractData.address,
              chainId: chainId,
            },
            {
              new: true,
              upsert: true,
            }
          );
        })
    );
  }

  private static contractInstanceId(chainId: string, contractName: string, address: string): string {
    return `${contractName}::${chainId}::${address}`;
  }

  private static toLogRegistered(event: Event): LogRegistered {
    return {
      destination: event.args[0],
      bytes32: event.args[1],
      anchor: event.blockNumber,
    };
  }
}
