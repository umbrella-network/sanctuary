import { inject, injectable } from 'inversify';

import { NonEvmChainsIds, ChainsIds } from '../types/ChainsIds';
import ChainInstance from '../models/ChainInstance';
import Settings from '../types/Settings';

@injectable()
export class DispatcherDetector {
  @inject('Settings') private readonly settings: Settings;

  apply = async (chainId: ChainsIds): Promise<boolean> => {
    try {
      if (chainId == this.settings.blockchain.homeChain.chainId) {
        return true;
      }

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
