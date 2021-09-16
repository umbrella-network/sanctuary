import { inject, injectable } from 'inversify';
import Blockchain from '../lib/Blockchain';

export type BlockchainCollection = {
  [key: string]: Blockchain;
}

@injectable()
export class BlockchainRepository {
  private collection: BlockchainCollection = {};

  /*
  #Example of implementation (if each blockchain requires a separate class in a '/blockchains' folder):

  constructor(
    @inject(BinanceBlockchain) bsc: BinanceBlockchain,
    @inject(EthereumBlockchain) eth: EthereumBlockchain
  ) {
    this.collection = { bsc, eth };
  }

  # If we can make the classes sufficiently generic, we could do this:

  constructor(
    @inject('Settings') settings: Settings,
    @inject(BlockchainFactory) blockchainFactory: BlockchainFactory
  ) {
    this.collection = {
      bsc: blockchainFactory.apply({ chainId: 'bsc', ... }),
      eth: blockchainFactory.apply({ chainId: 'eth', ... })
    };
  }

  # If the constructor above becomes way too complex, we should extract that into a BlockchainRepositoryFactory class

  */

  get(id: string): Blockchain | undefined {
    return this.collection[id];
  }
}