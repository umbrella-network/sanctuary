import { inject, injectable } from 'inversify';
import { ChainContract } from '../contracts/ChainContract';
import { ChainStatus } from '../types/ChainStatus';
import { Logger } from 'winston';
import StatsdClient from 'statsd-client';
import { ChainContractRepository } from '../repositories/ChainContractRepository';
import { ForeignChainStatus } from '../types/ForeignChainStatus';
import { ForeignChainContract } from '../contracts/ForeignChainContract';

@injectable()
class BlockMintedReporter {
  @inject('Logger') logger!: Logger;
  @inject('StatsdClient') statsdClient?: StatsdClient;
  @inject(ChainContractRepository) chainContractRepository!: ChainContractRepository;

  call = async (chainId: string): Promise<void> => {
    const timestamp = Math.trunc(Date.now() / 1000);
    const contract: ChainContract | ForeignChainContract = this.chainContractRepository.get(chainId);
    const chainStatus = await contract.resolveStatus<ChainStatus | ForeignChainStatus>();
    const delta = timestamp - chainStatus.lastDataTimestamp;
    this.logger.debug(`Last minted block time: ${chainStatus.lastDataTimestamp}, block delta time: ${delta}`);
    this.statsdClient?.gauge('LastMintedBlockDeltaTime', delta);
  };
}

export default BlockMintedReporter;
