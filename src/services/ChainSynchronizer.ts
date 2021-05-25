import { Logger } from 'winston';
import { inject, injectable } from 'inversify';
import ChainContract from '../contracts/ChainContract';
import ChainInstance from '../models/ChainInstance';
import Blockchain from '../lib/Blockchain';

@injectable()
class ChainSynchronizer {
  @inject('Logger') private logger!: Logger;
  @inject(ChainContract) private chainContract!: ChainContract;
  @inject(Blockchain) private blockchain!: Blockchain;

  async apply(): Promise<void> {
    const currentChain = (await this.chainContract.resolveContract()).contract;
    const blocksCountOffset = await currentChain.blocksCountOffset();

    try {
      await ChainInstance.create({
        _id: `chain::${currentChain.address}`,
        address: currentChain.address,
        blocksCountOffset: blocksCountOffset,
        dataTimestamp: new Date(),
      });

      this.logger.info(`Detected new contract: ${currentChain.address}`);
    } catch (e) {
      if (!e.message.includes('E11000')) {
        this.logger.error(e);
      }
    }
  }
}

export default ChainSynchronizer;
