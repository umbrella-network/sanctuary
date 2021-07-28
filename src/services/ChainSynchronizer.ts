import { Logger } from 'winston';
import { ABI } from '@umb-network/toolbox';
import { inject, injectable } from 'inversify';
import ChainContract from '../contracts/ChainContract';
import ChainInstance, { IChainInstance } from '../models/ChainInstance';
import Blockchain from '../lib/Blockchain';
import { Contract, Event } from 'ethers';
import Settings from '../types/Settings';
import { LogRegistered } from '../types/events';
import { CHAIN_CONTRACT_NAME_BYTES32 } from '@umb-network/toolbox/dist/constants';
import { ChainStatus } from '../types/ChainStatus';
import { CreateBatchRanges } from './CreateBatchRanges';
import Block from '../models/Block';

@injectable()
class ChainSynchronizer {
  @inject('Logger') private logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(ChainContract) private chainContract!: ChainContract;
  @inject(Blockchain) private blockchain!: Blockchain;

  async apply(): Promise<void> {
    const [, status] = await this.chainContract.resolveStatus();
    await this.synchronizeChains(status);
  }

  private async synchronizeChains(chainStatus: ChainStatus): Promise<void> {
    const [fromBlock, toBlock] = await ChainSynchronizer.calculateBlockNumberRange(
      chainStatus,
      this.settings.blockchain.startBlockNumber
    );
    this.logger.info(`Synchronizing Chains for blocks ${fromBlock} - ${toBlock}`);

    const ranges = CreateBatchRanges.apply(fromBlock, toBlock, this.settings.blockchain.scanBatchSize);
    const queue = [];

    for (const [batchFrom, batchTo] of ranges) {
      queue.push(this.synchronizeChainsForBatch(batchFrom, batchTo));
    }

    await Promise.all(queue);
  }

  private async synchronizeChainsForBatch(fromBlock: number, toBlock: number): Promise<IChainInstance[]> {
    const events = await this.scanForEvents(fromBlock, toBlock);
    const offsets = await this.resolveOffsets(events.map((event) => event.destination));

    this.logger.debug(`got ${events.length} events for new Chain`);

    return Promise.all(
      events.map((logRegistered, i) => {
        this.logger.info(`Detected new Chain contract: ${logRegistered.destination} at ${logRegistered.anchor}`);

        return ChainInstance.findOneAndUpdate(
          {
            _id: `chain::${logRegistered.destination}`,
          },
          {
            anchor: logRegistered.anchor,
            address: logRegistered.destination,
            blocksCountOffset: offsets[i],
          },
          {
            new: true,
            upsert: true,
          }
        );
      })
    );
  }

  private async resolveOffsets(chainAddresses: string[]): Promise<number[]> {
    return Promise.all(chainAddresses.map((address) => this.chainContract.resolveBlocksCountOffset(address)));
  }

  private static async calculateBlockNumberRange(
    chainStatus: ChainStatus,
    startBlockNumber: number
  ): Promise<[number, number]> {
    const lastAnchor = await ChainSynchronizer.getLastSavedAnchor();
    const lookBack = Math.max(
      0,
      startBlockNumber < 0 ? chainStatus.blockNumber.sub(100000).toNumber() : startBlockNumber
    );
    const fromBlock = lastAnchor > 0 ? lastAnchor : lookBack;
    return [fromBlock + 1, chainStatus.blockNumber.toNumber()];
  }

  private static async getLastSavedAnchor(): Promise<number> {
    const blocks = await Block.find({}).limit(1).sort({ anchor: -1 }).exec();
    if (blocks.length) {
      return blocks[0] ? blocks[0].anchor : -1;
    }

    const chains = await ChainInstance.find({}).limit(1).sort({ anchor: -1 }).exec();
    return chains[0] ? chains[0].anchor : -1;
  }

  private async scanForEvents(fromBlock: number, toBlock: number): Promise<LogRegistered[]> {
    this.logger.info(`Checking for new chain ${fromBlock} - ${toBlock}`);
    // event LogRegistered(address indexed destination, bytes32 name);
    const registry: Contract = new Contract(
      this.settings.blockchain.contracts.registry.address,
      ABI.registryAbi,
      this.blockchain.provider
    );

    const filter = registry.filters.LogRegistered();
    return this.filterChainEvents(await registry.queryFilter(filter, fromBlock, toBlock));
  }

  private filterChainEvents(events: Event[]): LogRegistered[] {
    return events
      .map(ChainSynchronizer.toLogRegistered)
      .filter((logRegistered) => logRegistered.bytes32 === CHAIN_CONTRACT_NAME_BYTES32);
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
