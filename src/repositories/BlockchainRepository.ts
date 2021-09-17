import { inject, injectable } from 'inversify';
import { Blockchain } from '../lib/Blockchain';
import Settings from '../types/Settings';

export type BlockchainCollection = {
  [key: string]: Blockchain;
};

@injectable()
export class BlockchainRepository {
  private collection: BlockchainCollection = {};

  constructor(@inject('Settings') settings: Settings) {
    this.collection = {
      bsc: new Blockchain('bsc', settings),
      ethereum: new Blockchain('ethereum', settings),
    };
  }

  get(id: string): Blockchain {
    if (!this.collection[id]) {
      throw Error(`Blockchain ${id} does not exists`);
    }

    return this.collection[id];
  }
}
