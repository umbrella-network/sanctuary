import { injectable } from 'inversify';
import Block from '../models/Block';
import ChainInstance from '../models/ChainInstance';
import { ChainsIds } from '../types/ChainsIds';
import BlockChainData from '../models/BlockChainData';

@injectable()
class LatestIdsProvider {
  getLatestBlockId = async (): Promise<number> => {
    const [newestBlock] = await Block.find({}).sort({ blockId: -1 }).limit(1).exec();
    return newestBlock.blockId;
  };

  getLastSavedBlockIdAndStartAnchor = async (
    chainId: ChainsIds
  ): Promise<[lastSavedBlockId: number, lastAnchor: number]> => {
    const lastSavedBlock = await BlockChainData.find({ chainId: chainId }).sort({ blockId: -1 }).limit(1).exec();

    return lastSavedBlock[0]
      ? [lastSavedBlock[0].blockId, lastSavedBlock[0].anchor + 1]
      : [0, await this.getLowestChainAnchor(chainId)];
  };

  private getLowestChainAnchor = async (chainId: ChainsIds): Promise<number> => {
    const oldestChain = await ChainInstance.find({ chainId: chainId }).sort({ blockId: 1 }).limit(1).exec();
    return oldestChain[0].anchor;
  };
}

export default LatestIdsProvider;
