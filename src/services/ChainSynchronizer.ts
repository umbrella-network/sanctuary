import { Logger } from 'winston';
import { ABI, ContractRegistry } from '@umb-network/toolbox';
import { inject, injectable } from 'inversify';
import ChainInstance, { IChainInstance } from '../models/ChainInstance';
import { Contract, ethers, Event } from 'ethers';
import { LogRegistered } from '../types/events';
import { CHAIN_CONTRACT_NAME, CHAIN_CONTRACT_NAME_BYTES32 } from '@umb-network/toolbox/dist/constants';
import { CreateBatchRanges } from './CreateBatchRanges';
import Settings from '../types/Settings';
import { BlockchainRepository } from '../repositories/BlockchainRepository';
import { ChainContractRepository } from '../repositories/ChainContractRepository';
import { ChainsIds, NonEvmChainsIds } from '../types/ChainsIds';
import * as fastq from 'fastq';
import type { queueAsPromised } from 'fastq';
import { BlockRepository } from '../repositories/BlockRepository';
import { FullBlockData } from '../types/blocks';
import { MappingRepository } from '../repositories/MappingRepository';
import { LAST_BLOCK_CHECKED_FOR_NEW_CHAIN } from '../constants/mappings';

type SyncChainTask = {
  batchFrom: number;
  batchTo: number;
};

@injectable()
class ChainSynchronizer {
  @inject('Logger') private logger!: Logger;
  @inject(BlockchainRepository) private blockchainRepository!: BlockchainRepository;
  @inject(BlockRepository) private blockRepository!: BlockRepository;
  @inject(ChainContractRepository) chainContractRepository: ChainContractRepository;
  @inject(MappingRepository) mappingRepository: MappingRepository;
  @inject('Settings') settings: Settings;

  apply = async (chainId: ChainsIds): Promise<void> => {
    if (chainId === ChainsIds.SOLANA) {
      return;
    }

    const blockchain = this.blockchainRepository.get(chainId);
    const blockNumber = await blockchain.getBlockNumber();

    if (await this.chainUpToDate(chainId)) {
      await this.mappingRepository.set(LAST_BLOCK_CHECKED_FOR_NEW_CHAIN(chainId), blockNumber.toString(10));
      this.logger.info(`[${chainId}] chain up to date.`);
      return;
    }

    this.logger.info(`[${chainId}] chain not up to date.`);
    await this.synchronizeChains(chainId, blockNumber);
  };

  private chainUpToDate = async (chainId: string): Promise<boolean> => {
    this.logger.info(`[${chainId}] checking if chain up to date.`);
    const blockchain = this.blockchainRepository.get(chainId);
    const registry = new ContractRegistry(blockchain.getProvider(), blockchain.getContractRegistryAddress());

    let currentChainAddress;

    try {
      currentChainAddress = await registry.getAddress(CHAIN_CONTRACT_NAME);
    } catch (e) {
      this.logger.info(`[${chainId}] unable to get address. Trying provider again`);
      currentChainAddress = await registry.getAddress(CHAIN_CONTRACT_NAME);
    }

    this.logger.info(`[${chainId}] finding chain instance.`);
    const id = ChainSynchronizer.chainInstanceId(chainId, currentChainAddress);
    const results = await ChainInstance.findById(id);

    if (results) {
      this.logger.info(`[${chainId}] chain ${results.address}, at anchor ${results.anchor}`);
    }

    return !!results;
  };

  private synchronizeChains = async (chainId: ChainsIds, currentBlockNumber: number): Promise<void> => {
    const blockchain = this.blockchainRepository.get(chainId);

    const [fromBlock, toBlock] = await this.calculateBlockNumberRange(
      chainId,
      blockchain.settings.startBlockNumber,
      currentBlockNumber,
      blockchain.settings.confirmations
    );

    this.logger.info(`[${chainId}] Synchronizing Chains for blocks ${fromBlock} - ${toBlock}`);

    const ranges = CreateBatchRanges.apply(fromBlock, toBlock, blockchain.settings.scanBatchSize);

    const worker = async (task: SyncChainTask) => {
      await this.synchronizeChainsForBatch(chainId, task.batchFrom, task.batchTo);
    };

    const queue: queueAsPromised<SyncChainTask> = fastq.promise(worker, blockchain.settings.maxRequestConcurrency);

    ranges.map(([batchFrom, batchTo]) => {
      queue.push({ batchFrom, batchTo });
    });

    await queue.drained();
  };

  private synchronizeChainsForBatch = async (
    chainId: ChainsIds,
    fromBlock: number,
    toBlock: number
  ): Promise<IChainInstance[]> => {
    const events = await this.scanForEvents(chainId, fromBlock, toBlock);

    const offsets = await this.resolveOffsets(
      chainId,
      events.map((event) => event.destination)
    );

    this.logger.debug(`[${chainId}] got ${events.length} events for new Chain at ${fromBlock}-${toBlock}`);

    const versions = await Promise.all(
      events.map((logRegistered) => {
        return this.resolveVersion(chainId, logRegistered.destination);
      })
    );

    return Promise.all(
      events.map((logRegistered, i) => {
        const { destination, anchor } = logRegistered;

        this.logger.info(`[${chainId}] Detected new Chain: ${destination} v${versions[i]} at ${anchor}`);

        return ChainInstance.findOneAndUpdate(
          {
            _id: ChainSynchronizer.chainInstanceId(chainId, destination),
          },
          {
            anchor: anchor,
            address: destination,
            blocksCountOffset: offsets[i],
            chainId: chainId,
            version: versions[i],
          },
          {
            new: true,
            upsert: true,
          }
        );
      })
    );
  };

  private resolveOffsets = async (chainId: ChainsIds, chainAddresses: string[]): Promise<number[]> => {
    const chainContract = this.chainContractRepository.get(chainId);
    return Promise.all(chainAddresses.map((address) => chainContract.resolveBlocksCountOffset(address)));
  };

  private calculateBlockNumberRange = async (
    chainId: ChainsIds,
    startBlockNumber: number,
    endBlockNumber: number,
    confirmations: number
  ): Promise<[number, number]> => {
    const prefix = `[${chainId}] `;

    const [lastCheckBlockCached, lastSavedAnchor] = await Promise.all([
      this.mappingRepository.get(LAST_BLOCK_CHECKED_FOR_NEW_CHAIN(chainId)),
      this.getLastSavedAnchor(chainId),
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

  private getLastSavedAnchor = async (chainId: ChainsIds): Promise<number> => {
    const lastBlock = await this.getLastBlock(chainId);

    if (lastBlock) {
      return lastBlock.anchor ? lastBlock.anchor : -1;
    }

    const chains = await ChainInstance.find({ chainId }).limit(1).sort({ anchor: -1 }).exec();
    return chains[0] ? chains[0].anchor : -1;
  };

  private getLastBlock = async (chainId: ChainsIds): Promise<FullBlockData | undefined> => {
    const blocks = await this.blockRepository.find({
      chainId,
      offset: 0,
      limit: 1,
      sort: { anchor: -1 },
    });

    return blocks.length ? blocks[0] : undefined;
  };

  private scanForEvents = async (chainId: ChainsIds, fromBlock: number, toBlock: number): Promise<LogRegistered[]> => {
    const blockchain = this.blockchainRepository.get(chainId);

    this.logger.info(`[${chainId}] Checking for new chain ${fromBlock} - ${toBlock}`);
    // event LogRegistered(address indexed destination, bytes32 name);
    const registry: Contract = new Contract(
      blockchain.getContractRegistryAddress(),
      ABI.registryAbi,
      blockchain.getProvider()
    );

    const filter = registry.filters.LogRegistered();
    return this.filterChainEvents(await registry.queryFilter(filter, fromBlock, toBlock));
  };

  private filterChainEvents(events: Event[]): LogRegistered[] {
    return events
      .map(ChainSynchronizer.toLogRegistered)
      .filter((logRegistered) => logRegistered.bytes32 === CHAIN_CONTRACT_NAME_BYTES32);
  }

  private static chainInstanceId(chainId: string, chainAddress: string): string {
    return `chain::${chainId}::${chainAddress}`;
  }

  private static toLogRegistered(event: Event): LogRegistered {
    return {
      destination: event.args[0],
      bytes32: event.args[1],
      anchor: event.blockNumber,
    };
  }

  private resolveVersion = async (chainId: ChainsIds, chainAddress: string): Promise<number> => {
    try {
      const nonEvm = NonEvmChainsIds.includes(chainId);

      const blockchain = nonEvm
        ? this.blockchainRepository.getGeneric(chainId)
        : this.blockchainRepository.get(chainId);

      const data = ethers.utils.id('VERSION()').slice(0, 10);
      const provider = await blockchain.getProvider();
      const version = await provider.call({ to: chainAddress, data });

      if (!version || version === '0x') {
        throw new Error('version is empty');
      }

      const versionNumber = parseInt(version.toString(), 16);

      if (isNaN(versionNumber)) {
        throw new Error(`version (${version}) is NaN`);
      }

      return versionNumber;
    } catch (e: unknown) {
      this.logger.debug(`[${chainId}] resolveVersion: ${(<Error>e).message}`);
      return 1;
    }
  };
}

export default ChainSynchronizer;
