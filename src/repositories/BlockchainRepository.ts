import { inject, injectable } from 'inversify';
import { Blockchain } from '../lib/Blockchain';
import Settings from '../types/Settings';
import { ChainsIds, ForeignChainsIds } from '../types/ChainsIds';

export type BlockchainCollection = {
  [key: string]: Blockchain;
};

@injectable()
export class BlockchainRepository {
  private collection: BlockchainCollection = {};

  constructor(@inject('Settings') settings: Settings) {
    [ChainsIds.BSC, ...ForeignChainsIds].forEach((chainId) => {
      this.collection[chainId] = new Blockchain({ chainId, settings });
    });
  }

  get(id: string): Blockchain {
    if (!this.collection[id]) {
      throw Error(`[BlockchainRepository] Blockchain ${id} does not exists`);
    }

    return this.collection[id];
  }
}
