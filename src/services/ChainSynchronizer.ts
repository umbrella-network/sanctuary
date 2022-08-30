import { Logger } from 'winston';
import { ABI, ContractRegistry } from '@umb-network/toolbox';
import { inject, injectable } from 'inversify';
import ChainInstance, { IChainInstance } from '../models/ChainInstance';
import { Blockchain } from '../lib/Blockchain';
import { Contract, Event } from 'ethers';
import { LogRegistered } from '../types/events';
import { CHAIN_CONTRACT_NAME, CHAIN_CONTRACT_NAME_BYTES32 } from '@umb-network/toolbox/dist/constants';
import { CreateBatchRanges } from './CreateBatchRanges';
import Block, { IBlock } from '../models/Block';
import Settings from '../types/Settings';
import ForeignBlock, { IForeignBlock } from '../models/ForeignBlock';
import { BlockchainRepository } from '../repositories/BlockchainRepository';
import { ChainContractRepository } from '../repositories/ChainContractRepository';
import { BaseChainContract } from '../contracts/BaseChainContract';
import { ChainsIds } from '../types/ChainsIds';
import * as fastq from 'fastq';
import type { queueAsPromised } from 'fastq';

type SyncChainTask = {
  batchFrom: number;
  batchTo: number;
};

@injectable()
class ChainSynchronizer {
  @inject('Logger') private logger!: Logger;
  @inject(BlockchainRepository) private blockchainRepository!: BlockchainRepository;
  @inject(ChainContractRepository) chainContractRepository: ChainContractRepository;
  @inject('Settings') settings: Settings;

  private blockchain!: Blockchain;
  private chainContract!: BaseChainContract;
  private registry!: ContractRegistry;

  apply = async (chainId: string): Promise<void> => {
    if (chainId === ChainsIds.SOLANA) {
      return;
    }

    this.blockchain = this.blockchainRepository.get(chainId);
    this.chainContract = this.chainContractRepository.get(chainId);

    this.registry = new ContractRegistry(this.blockchain.getProvider(), this.blockchain.getContractRegistryAddress());

    if (await this.chainUpToDate()) {
      this.logger.info(`[${this.blockchain.chainId}] chain up to date.`);
      return;
    }

    this.logger.info(`[${this.blockchain.chainId}] chain not up to date.`);
    const blockNumber = await this.blockchain.getBlockNumber();
    await this.synchronizeChains(blockNumber);
  };

  private chainUpToDate = async (): Promise<boolean> => {
    this.logger.info(`[${this.blockchain.chainId}] checking if chain up to date.`);
    let currentChainAddress;

    try {
      currentChainAddress = await this.registry.getAddress(CHAIN_CONTRACT_NAME);
    } catch (e) {
      this.logger.info(`[${this.blockchain.chainId}] unable to get address.  Trying provider again`);
      this.registry = new ContractRegistry(this.blockchain.getProvider(), this.blockchain.getContractRegistryAddress());
      currentChainAddress = await this.registry.getAddress(CHAIN_CONTRACT_NAME);
    }

    this.logger.info(`[${this.blockchain.chainId}] finding chain instance.`);
    const id = ChainSynchronizer.chainInstanceId(this.blockchain.chainId, currentChainAddress);
    const results = await ChainInstance.findById(id);

    if (results) {
      this.logger.info(`[${this.blockchain.chainId}] chain ${results.address}, at anchor ${results.anchor}`);
    }

    return !!results;
  };

  private synchronizeChains = async (currentBlockNumber: number): Promise<void> => {
    this.logger.info(`[${this.blockchain.chainId}] calculating block number range.`);

    const [fromBlock, toBlock] = await this.calculateBlockNumberRange(
      this.blockchain.settings.startBlockNumber,
      currentBlockNumber
    );

    this.logger.info(`[${this.blockchain.chainId}] Synchronizing Chains for blocks ${fromBlock} - ${toBlock}`);

    const ranges = CreateBatchRanges.apply(fromBlock, toBlock, this.blockchain.settings.scanBatchSize);

    const worker = async (task: SyncChainTask) => {
      await this.synchronizeChainsForBatch(task.batchFrom, task.batchTo);
    };

    const queue: queueAsPromised<SyncChainTask> = fastq.promise(worker, this.blockchain.settings.maxRequestConcurrency);

    ranges.map(([batchFrom, batchTo]) => {
      queue.push({ batchFrom, batchTo });
    });

    await queue.drained();
  };

  private synchronizeChainsForBatch = async (fromBlock: number, toBlock: number): Promise<IChainInstance[]> => {
    const { chainId } = this.blockchain;
    const events = await this.scanForEvents(fromBlock, toBlock);
    const offsets = await this.resolveOffsets(events.map((event) => event.destination));

    this.logger.debug(
      `[${this.blockchain.chainId}] got ${events.length} events for new Chain at ${fromBlock}-${toBlock}`
    );

    return Promise.all(
      events.map((logRegistered, i) => {
        const { destination, anchor } = logRegistered;
        this.logger.info(`[${chainId}] Detected new Chain contract: ${destination} at ${anchor}`);

        return ChainInstance.findOneAndUpdate(
          {
            _id: ChainSynchronizer.chainInstanceId(chainId, destination),
          },
          {
            anchor: anchor,
            address: destination,
            blocksCountOffset: offsets[i],
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

  private resolveOffsets = async (chainAddresses: string[]): Promise<number[]> => {
    return Promise.all(chainAddresses.map((address) => this.chainContract.resolveBlocksCountOffset(address)));
  };

  private calculateBlockNumberRange = async (
    startBlockNumber: number,
    endBlockNumber: number
  ): Promise<[number, number]> => {
    const prefix = `[${this.blockchain.chainId}] `;
    const lastAnchor = await this.getLastSavedAnchor();

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
    const lastBlock = await this.getLastBlock();

    if (lastBlock) {
      return lastBlock.anchor ? lastBlock.anchor : -1;
    }

    const chains = await ChainInstance.find({ chainId: this.blockchain.chainId }).limit(1).sort({ anchor: -1 }).exec();
    return chains[0] ? chains[0].anchor : -1;
  };

  private getLastBlock = async (): Promise<IBlock | IForeignBlock | undefined> => {
    if (this.blockchain.chainId === this.settings.blockchain.homeChain.chainId) {
      const blocks = await Block.find({}).limit(1).sort({ anchor: -1 }).exec();
      return blocks.length ? blocks[0] : undefined;
    }

    const blocks = await ForeignBlock.find({ foreignChainId: this.blockchain.chainId })
      .limit(1)
      .sort({ anchor: -1 })
      .exec();
    return blocks.length ? blocks[0] : undefined;
  };

  private scanForEvents = async (fromBlock: number, toBlock: number): Promise<LogRegistered[]> => {
    this.logger.info(`[${this.blockchain.chainId}] Checking for new chain ${fromBlock} - ${toBlock}`);
    // event LogRegistered(address indexed destination, bytes32 name);
    const registry: Contract = new Contract(
      this.blockchain.getContractRegistryAddress(),
      ABI.registryAbi,
      this.blockchain.getProvider()
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
}

export default ChainSynchronizer;
