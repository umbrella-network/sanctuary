import { inject, injectable } from 'inversify';
import { BlockchainRepository } from '../../repositories/BlockchainRepository';
import { MappingRepository } from '../../repositories/MappingRepository';
import { ChainsIds } from '../../types/ChainsIds.js';

@injectable()
export class OnChainTxFetcher {
  @inject(BlockchainRepository) private blockchainRepository: BlockchainRepository;
  @inject(MappingRepository) private mappingRepository: MappingRepository;

  async call(chainId: ChainsIds, initBlock: number | undefined): Promise<void> {
    return;

    if (!initBlock) return;

    const lastCheckedBlock = await this.mappingRepository.get(this.lastCheckedBlockMappingKey(chainId));
    const currentBlock = await this.blockchainRepository.get(chainId).getBlockNumber();

    const from = this.blockFrom(lastCheckedBlock, initBlock);
    const to = this.blockTo(chainId, from, currentBlock);
    if (from >= to) return;

    // const { blockId } = await Block.findOne({ status: BlockStatus.Finalized }).sort({ blockId: -1 });
    // const leaves = await Leaf.find({ blockId });
  }

  private lastCheckedBlockMappingKey(chainId: string): string {
    return `OnChainTxFetcher_lastCheckedBlock_${chainId}`;
  }

  private blockFrom(lastCheckedBlock: string | undefined, initBlock: number): number {
    return Math.max(parseInt(lastCheckedBlock, 10), initBlock);
  }

  private blockTo(chainId: ChainsIds, blockFrom: number, currentBlock: number): number {
    switch (chainId) {
      case ChainsIds.ARBITRUM:
        return Math.min(blockFrom + 1000, currentBlock);

      default:
        throw new Error(`[OnChainTxFetcher] now supported chain ${chainId}`);
    }
  }
}
