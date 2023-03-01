import { injectable } from 'inversify';

import ChainInstance from '../models/ChainInstance';
import BlockChainData from '../models/BlockChainData';
import { ChainsIds } from '../types/ChainsIds';

@injectable()
export class LatestIdsProvider {
  getLastSavedBlockId = async (chainId: ChainsIds): Promise<number> => {
    const lastSavedBlock = await BlockChainData.find({ chainId: chainId }).sort({ blockId: -1 }).limit(1).exec();
    return lastSavedBlock[0] ? lastSavedBlock[0].blockId : 0;
  };

  getLastAnchor = async (chainId: ChainsIds): Promise<number> => {
    const lastSavedBlock = await BlockChainData.find({ chainId: chainId }).sort({ blockId: -1 }).limit(1).exec();
    return lastSavedBlock[0] ? lastSavedBlock[0].anchor + 1 : await this.getLowestChainAnchor(chainId);
  };

  private getLowestChainAnchor = async (chainId: ChainsIds): Promise<number> => {
    const oldestChain = await ChainInstance.find({ chainId: chainId }).sort({ anchor: 1 }).limit(1).exec();

    if (oldestChain.length === 0) {
      return 0;
    }

    return oldestChain[0].anchor;
  };
}
