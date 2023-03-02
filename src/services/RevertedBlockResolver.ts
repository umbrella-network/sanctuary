import { inject, injectable } from 'inversify';
import Block from '../models/Block';
import { Logger } from 'winston';
import BlockChainData from '../models/BlockChainData';
import { DeleteWriteOpResultObject } from 'mongodb';
import Settings from '../types/Settings';
import { MappingRepository } from '../repositories/MappingRepository';
import { LAST_BLOCK_CHECKED_FOR_MINT_EVENT } from '../constants/mappings';

@injectable()
class RevertedBlockResolver {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(MappingRepository) mappingRepository: MappingRepository;

  async apply(lastSubmittedBlockId: number, nextBlockId: number, chainId: string): Promise<number> {
    if (lastSubmittedBlockId <= nextBlockId) {
      this.logger.debug(`[${chainId}] no reverts`);
      return -1;
    }

    if (nextBlockId < 400_000) {
      // in case of bugs, we don't want to delete all the blocks, so this is sanity check
      this.logger.warn(`[${chainId}] RevertedBlockResolver: invalid nextBlockId ${nextBlockId}`);
      return -1;
    }

    this.logger.warn(`[${chainId}] Block reverted: from ${lastSubmittedBlockId} --> ${nextBlockId}`);

    const [blockRes] = await Promise.all([
      this.revertBlockChainDatas(nextBlockId, chainId),
      this.revertCachedBlock(chainId, nextBlockId),
    ]);

    this.logger.info(`[${chainId}] because of reverts we deleted ${blockRes.deletedCount} blocks >= ${nextBlockId}`);

    return blockRes.deletedCount;
  }

  private async revertCachedBlock(chainId: string, nextBlockId: number): Promise<void> {
    const lastBlockKey = LAST_BLOCK_CHECKED_FOR_MINT_EVENT(chainId);
    const lastCheckedBlock = await this.mappingRepository.get(lastBlockKey);
    const lastCheckedBlockInt = lastCheckedBlock ? parseInt(lastCheckedBlock, 10) : 0;

    if (lastCheckedBlockInt > nextBlockId) {
      this.logger.warn(`[${chainId}] reverted ${lastBlockKey} to ${nextBlockId - 1}`);
      await this.mappingRepository.set(lastBlockKey, (nextBlockId - 1).toString(10));
    }
  }

  private async revertBlocks(nextBlockId: number): Promise<void> {
    this.logger.warn(`[revertBlocks] deleting Blocks: blockId gte ${nextBlockId}`);
    await Block.collection.deleteMany({ blockId: { $gte: nextBlockId } });
  }

  private async revertBlockChainDatas(nextBlockId: number, chainId: string): Promise<DeleteWriteOpResultObject> {
    const deleteBlockChainData = await BlockChainData.collection.deleteMany({
      chainId: chainId,
      blockId: { $gte: nextBlockId },
    });

    const remainingBlockChainDatas = await BlockChainData.collection.countDocuments({ blockId: { $gte: nextBlockId } });

    this.logger.warn(
      `[${chainId}] deleting many BlockChainData: blockId gte ${nextBlockId}, remaining blocks: ${remainingBlockChainDatas}`
    );

    if (remainingBlockChainDatas === 0) {
      await this.revertBlocks(nextBlockId);
    }

    return deleteBlockChainData;
  }
}

export default RevertedBlockResolver;
