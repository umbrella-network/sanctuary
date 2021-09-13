import { inject, injectable } from 'inversify';
import ChainContract from '../contracts/ChainContract';
import { ChainStatus } from '../types/ChainStatus';
import { Logger } from 'winston';
import StatsdClient from 'statsd-client';

@injectable()
class BlockMintedReporter {
  @inject('Logger') logger!: Logger;
  @inject('StatsdClient') statsdClient?: StatsdClient;
  @inject(ChainContract) chainContract!: ChainContract;

  async call(): Promise<void> {
    const timestamp = Math.trunc(Date.now() / 1000);
    const chainStatus = await this.chainContract.resolveStatus<ChainStatus>();
    const delta = timestamp - chainStatus.lastDataTimestamp;
    this.logger.debug(`Last minted block time: ${chainStatus.lastDataTimestamp}, block delta time: ${delta}`);
    this.statsdClient?.gauge('LastMintedBlockDeltaTime', delta);
  }
}

export default BlockMintedReporter;
