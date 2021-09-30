import { inject, injectable } from 'inversify';
import Block from '../models/Block';
import { Logger } from 'winston';
import ForeignBlock from '../models/ForeignBlock';
import { DeleteWriteOpResultObject } from 'mongodb';

@injectable()
class RevertedBlockResolver {
  @inject('Logger') logger!: Logger;

  async apply(lastSubmittedBlockId: number, nextBlockId: number, chainId?: string): Promise<number> {
    if (lastSubmittedBlockId <= nextBlockId) {
      return -1;
    }

    this.logger.warn(`Block reverted: from ${lastSubmittedBlockId} --> ${nextBlockId}`);
    const blockRes = await (chainId
      ? RevertedBlockResolver.revertHomeBlocks(nextBlockId)
      : RevertedBlockResolver.revertForeignBlocks(nextBlockId, chainId));
    this.logger.info(`because of reverts we deleted ${blockRes.deletedCount} blocks >= ${nextBlockId}`);

    return blockRes.deletedCount;
  }

  private static async revertHomeBlocks(nextBlockId: number): Promise<DeleteWriteOpResultObject> {
    return Block.collection.deleteMany({ blockId: { $gte: nextBlockId } });
  }

  private static async revertForeignBlocks(nextBlockId: number, chainId: string): Promise<DeleteWriteOpResultObject> {
    return ForeignBlock.collection.deleteMany({ chainId: chainId, blockId: { $gte: nextBlockId } });
  }
}

export default RevertedBlockResolver;
