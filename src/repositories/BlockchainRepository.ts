import { inject, injectable } from 'inversify';
import { Blockchain } from '../lib/Blockchain';
import Settings from '../types/Settings';
import { ChainsIds } from '../types/ChainsIds';

export type BlockchainCollection = {
  [key: string]: Blockchain;
};

@injectable()
export class BlockchainRepository {
  private collection: BlockchainCollection = {};

  constructor(@inject('Settings') settings: Settings) {
    this.collection = {
      bsc: new Blockchain({ chainId: ChainsIds.BSC, settings }),
      ethereum: new Blockchain({ chainId: ChainsIds.ETH, settings }),
    };
  }

  get(id: string): Blockchain {
    if (!this.collection[id]) {
      throw Error(`Blockchain ${id} does not exists`);
    }

    return this.collection[id];
  }
}
