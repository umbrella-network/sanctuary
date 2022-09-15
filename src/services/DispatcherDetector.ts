import { injectable } from 'inversify';

import { NonEvmChainsIds, ChainsIds } from '../types/ChainsIds';
import ChainInstance from '../models/ChainInstance';

@injectable()
export class DispatcherDetector {
  apply = async (chainId: ChainsIds): Promise<boolean> => {
    try {
      const nonEvm = NonEvmChainsIds.includes(chainId);

      if (nonEvm) {
        return false;
      }

      const [currentChain] = await ChainInstance.find({ chainId }).sort({ anchor: -1 }).limit(1);
      const versionWithDispatcher = 2;
      return currentChain?.version && currentChain.version >= versionWithDispatcher;
    } catch (ignore) {
      return false;
    }
  };
}
