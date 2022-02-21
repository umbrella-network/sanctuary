import { inject, injectable } from 'inversify';
import Block from '../models/Block';
import { Logger } from 'winston';
import ForeignBlock from '../models/ForeignBlock';
import { DeleteWriteOpResultObject } from 'mongodb';
import Settings from '../types/Settings';

@injectable()
class RevertedBlockResolver {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;

  async apply(lastSubmittedBlockId: number, nextBlockId: number, chainId?: string): Promise<number> {
    if (lastSubmittedBlockId <= nextBlockId) {
      return -1;
    }

    const chainName = chainId || this.settings.blockchain.homeChain.chainId;

    this.logger.warn(`[${chainName}] Block reverted: from ${lastSubmittedBlockId} --> ${nextBlockId}`);

    const blockRes = chainId
      ? await this.revertForeignBlocks(nextBlockId, chainId)
      : await this.revertHomeBlocks(nextBlockId);

    this.logger.info(`[${chainName}] because of reverts we deleted ${blockRes.deletedCount} blocks >= ${nextBlockId}`);

    return blockRes.deletedCount;
  }

  private async revertHomeBlocks(nextBlockId: number): Promise<DeleteWriteOpResultObject> {
    this.logger.warn(`[homeChain] deleting many: blockId gte ${nextBlockId}`);
    return Block.collection.deleteMany({ blockId: { $gte: nextBlockId } });
  }

  private async revertForeignBlocks(nextBlockId: number, chainId: string): Promise<DeleteWriteOpResultObject> {
    this.logger.warn(`[${chainId}] deleting many: blockId gte ${nextBlockId}`);
    return ForeignBlock.collection.deleteMany({ chainId: chainId, blockId: { $gte: nextBlockId } });
  }
}

export default RevertedBlockResolver;
