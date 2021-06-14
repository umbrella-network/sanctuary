import { inject, injectable } from 'inversify';
import ChainContract from '../contracts/ChainContract';
import { Logger } from 'winston';
import StatsDClient from '../lib/StatsDClient';

@injectable()
class BlockMintedReporter {
  @inject('Logger') logger!: Logger;
  @inject(ChainContract) chainContract!: ChainContract;

  async call(): Promise<void> {
    const timestamp = Math.trunc(Date.now() / 1000);
    const [, chainStatus] = await this.chainContract.resolveStatus();
    const delta = timestamp - chainStatus.lastDataTimestamp;
    this.logger.debug(`Last minted block time: ${chainStatus.lastDataTimestamp}`);
    this.logger.debug(`Last minted block delta time: ${delta}`);
    StatsDClient?.gauge('LastMintedBlockDeltaTime', delta);
  }
}

export default BlockMintedReporter;
