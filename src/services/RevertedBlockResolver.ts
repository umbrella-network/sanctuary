import { inject, injectable } from 'inversify';
import Block from '../models/Block';
import { Logger } from 'winston';

@injectable()
class RevertedBlockResolver {
  @inject('Logger') logger!: Logger;

  async apply(lastSubmittedBlockId: number, nextBlockId: number): Promise<number> {
    if (lastSubmittedBlockId <= nextBlockId) {
      return -1;
    }

    this.logger.warn(`Block reverted: from ${lastSubmittedBlockId} --> ${nextBlockId}`);
    const blockRes = await Block.collection.deleteMany({ blockId: { $gte: nextBlockId } });
    this.logger.info(`because of reverts we deleted ${blockRes.deletedCount} blocks >= ${nextBlockId}`);

    return blockRes.deletedCount;
  }
}

export default RevertedBlockResolver;
