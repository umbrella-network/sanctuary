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
    const bscBlockchain = blockchainRepository.get(ChainsIds.BSC);
    const ethBlockchain = blockchainRepository.get(ChainsIds.ETH);

    this.collection = {
      bsc:
        bscBlockchain.provider && bscBlockchain.getContractRegistryAddress()
          ? new ChainContract({ blockchain: bscBlockchain, settings })
          : undefined,

      ethereum:
        ethBlockchain.provider && ethBlockchain.getContractRegistryAddress()
          ? new ForeignChainContract({ blockchain: ethBlockchain, settings })
          : undefined,
    };
  }

  get(id: string): ChainContract | ForeignChainContract {
    if (!this.collection[id]) {
      console.warn(`[ChainContractRepository] Blockchain ${id} does not exists`);
    }

    return this.collection[id];
  }
}
