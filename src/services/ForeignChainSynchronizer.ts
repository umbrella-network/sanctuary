import { inject, injectable } from 'inversify';
import { Logger } from 'winston';
import Block, { IBlock } from '../models/Block';
import { ForeignBlockSynchronizer } from './ForeignChain';

@injectable()
class ForeignChainSynchronizer {
  @inject('Logger') logger: Logger;
  @inject(ForeignBlockSynchronizer) blockSynchronizer: ForeignBlockSynchronizer;

  apply = async (): Promise<void> => {
    const blocks = await this.resolveBlocks();
    blocks.forEach((block) => this.synchronizeBlock(block));
  }

  // Resolve blocks that need synchronization
  // This is foreign chain-specific, and might be more complex
  resolveBlocks = async (): Promise<IBlock[]> => {
    return await Block.find({ synchronizedAt: { $exists: false } });
  }

  synchronizeBlock = async (block: IBlock): Promise<void> => {
    this.logger.info(`Synchronizing Block ${block.id}`);
    this.blockSynchronizer.apply(block);
  }
}

export default ForeignChainSynchronizer;
