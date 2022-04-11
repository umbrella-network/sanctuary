import { inject, injectable } from 'inversify';
import { ChainStatus } from '../types/ChainStatus';
import { Logger } from 'winston';
import StatsdClient from 'statsd-client';
import { ChainContractRepository } from '../repositories/ChainContractRepository';
import { ForeignChainStatus } from '../types/ForeignChainStatus';
import { BaseChainContract } from '../contracts/BaseChainContract';
import { TimeService } from './TimeService';
import { BlockRepository } from '../repositories/BlockRepository';
import { BlockStatus } from '../types/blocks';

@injectable()
class BlockMintedReporter {
  @inject('Logger') logger!: Logger;
  @inject('StatsdClient') statsdClient?: StatsdClient;
  @inject(ChainContractRepository) chainContractRepository!: ChainContractRepository;
  @inject(BlockRepository) blockRepository!: BlockRepository;

  public async call(chainId: string): Promise<void> {
    const timestamp = TimeService.now();

    await Promise.all([
      this.reportContractLastMintedBlockTime(timestamp, chainId),
      this.reportMongoLastMintedBlockTime(timestamp, chainId),
    ]);
  }

  private async reportContractLastMintedBlockTime(timestamp: number, chainId: string): Promise<void> {
    let contract: BaseChainContract;

    try {
      contract = this.chainContractRepository.get(chainId);
    } catch (e) {
      this.logger.warn(`[BlockMintedReporter] Failed to get contract at ${chainId}: ${e.message}`);
      return;
    }

    const { lastDataTimestamp } = await contract.resolveStatus<ChainStatus | ForeignChainStatus>();
    const delta = timestamp - lastDataTimestamp;
    this.logger.debug(`[${chainId}] Last minted block time: ${lastDataTimestamp}, block delta time: ${delta}`);
    this.statsdClient?.gauge('LastMintedBlockDeltaTime', delta, { chain: chainId });
  }

  private async reportMongoLastMintedBlockTime(timestamp: number, chainId: string): Promise<void> {
    let dataTimestamp: Date | number;
    try {
      ({ dataTimestamp } = await this.blockRepository.findLatest({
        status: BlockStatus.Finalized,
        chainId: chainId !== 'bsc' ? chainId : undefined,
      }));
      dataTimestamp = dataTimestamp.getTime();
    } catch (e) {
      this.logger.warn(`[BlockMintedReporter] Failed to get MongoDB block at ${chainId}: ${e.message}`);
      return;
    }

    const delta = (timestamp * 1000 - dataTimestamp) / 1000;
    this.logger.debug(`[${chainId}] Last saved block time: ${dataTimestamp}, saved block delta time: ${delta}`);
    this.statsdClient?.gauge('LastSavedBlockDeltaTime', delta, { chain: chainId });
  }
}

export default BlockMintedReporter;
