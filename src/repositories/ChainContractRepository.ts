import { inject, injectable } from 'inversify';
import Settings from '../types/Settings';
import { ChainsIds } from '../types/ChainsIds';
import { ChainContract } from '../contracts/ChainContract';
import { BlockchainRepository } from './BlockchainRepository';
import { ForeignChainContract } from '../contracts/ForeignChainContract';

export type ChainContractCollection = {
  [key: string]: ChainContract | ForeignChainContract;
};

@injectable()
export class ChainContractRepository {
  private collection: ChainContractCollection = {};

  constructor(
    @inject('Settings') settings: Settings,
    @inject(BlockchainRepository) blockchainRepository: BlockchainRepository
  ) {
    this.collection = {
      bsc: new ChainContract({ blockchain: blockchainRepository.get(ChainsIds.BSC), settings }),
      eth: new ForeignChainContract({ blockchain: blockchainRepository.get(ChainsIds.ETH), settings }),
    };
  }

  get(id: string): ChainContract | ForeignChainContract {
    if (!this.collection[id]) {
      throw Error(`Blockchain ${id} does not exists`);
    }

    return this.collection[id];
  }
}
