import { inject, injectable } from 'inversify';
import Block from '../models/Block';
import { Logger } from 'winston';
import BlockChainData from '../models/BlockChainData';
import { DeleteWriteOpResultObject } from 'mongodb';
import Settings from '../types/Settings';

@injectable()
class RevertedBlockResolver {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;

  async apply(lastSubmittedBlockId: number, nextBlockId: number, chainId: string): Promise<number> {
    if (lastSubmittedBlockId <= nextBlockId) {
      return -1;
    }

    this.logger.warn(`[${chainId}] Block reverted: from ${lastSubmittedBlockId} --> ${nextBlockId}`);

    const blockRes = await this.revertBlockChainDatas(nextBlockId, chainId);

    this.logger.info(`[${chainId}] because of reverts we deleted ${blockRes.deletedCount} blocks >= ${nextBlockId}`);

    return blockRes.deletedCount;
  }

  private async revertBlocks(nextBlockId: number): Promise<void> {
    this.logger.warn(`[revertBlocks] deleting Blocks: blockId gte ${nextBlockId}`);
    await Block.collection.deleteMany({ blockId: { $gte: nextBlockId } });
  }

  private async revertBlockChainDatas(nextBlockId: number, chainId: string): Promise<DeleteWriteOpResultObject> {
    this.logger.warn(`[${chainId}] deleting many: blockId gte ${nextBlockId}`);

    const deleteBlockChainData = await BlockChainData.collection.deleteMany({
      chainId: chainId,
      blockId: { $gte: nextBlockId },
    });

    const blockChainCount = await BlockChainData.collection.count({ blockId: { $gte: nextBlockId } });

    if (blockChainCount === 0) {
      await this.revertBlocks(nextBlockId);
    }

    return deleteBlockChainData;
  }
}

export default RevertedBlockResolver;
