import { inject, injectable } from 'inversify';
import { ChainContract } from '../contracts/ChainContract';
import { ChainStatus } from '../types/ChainStatus';
import { Logger } from 'winston';
import StatsdClient from 'statsd-client';
import { ChainContractRepository } from '../repositories/ChainContractRepository';
import { ForeignChainStatus } from '../types/ForeignChainStatus';
import { BaseChainContract } from '../contracts/BaseChainContract';

@injectable()
class BlockMintedReporter {
  @inject('Logger') logger!: Logger;
  @inject('StatsdClient') statsdClient?: StatsdClient;
  @inject(ChainContractRepository) chainContractRepository!: ChainContractRepository;

  call = async (chainId: string): Promise<void> => {
    const timestamp = Math.trunc(Date.now() / 1000);
    let contract: BaseChainContract;

    try {
      contract = this.chainContractRepository.get(chainId);
    } catch (e) {
      // scheduler ??
      console.log(e.message);
      return;
    }

    const chainStatus = await contract.resolveStatus<ChainStatus | ForeignChainStatus>();
    const delta = timestamp - chainStatus.lastDataTimestamp;
    this.logger.debug(
      `[${chainId}] Last minted block time: ${chainStatus.lastDataTimestamp}, block delta time: ${delta}`
    );
    this.statsdClient?.gauge('LastMintedBlockDeltaTime', delta);
  };
}

export default BlockMintedReporter;
