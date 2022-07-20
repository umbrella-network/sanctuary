import { inject, injectable } from 'inversify';
import Settings from '../types/Settings';
import { ChainsIds, ForeignChainsIds, NonEvmChainsIds } from '../types/ChainsIds';
import { ChainContract } from '../contracts/ChainContract';
import { BlockchainRepository } from './BlockchainRepository';
import { ForeignChainContract } from '../contracts/ForeignChainContract';
import { IGenericForeignChainContract } from '../contracts/generic/IGenericForeignChainContract';
import { ForeignChainContractFactory } from '../factories/ForeignChainContractFactory';

export type ChainContractCollection = {
  [key: string]: ChainContract | ForeignChainContract | IGenericForeignChainContract;
};

@injectable()
export class ChainContractRepository {
  private collection: ChainContractCollection = {};

  constructor(
    @inject('Settings') settings: Settings,
    @inject(BlockchainRepository) blockchainRepository: BlockchainRepository
  ) {
    const bscBlockchain = blockchainRepository.get(ChainsIds.BSC);

    this.collection[ChainsIds.BSC] =
      bscBlockchain.provider && bscBlockchain.getContractRegistryAddress()
        ? new ChainContract({ blockchain: bscBlockchain, settings })
        : undefined;

    ForeignChainsIds.forEach((foreignChainId) => {
      if (NonEvmChainsIds.includes(foreignChainId)) {
        const blockchain = blockchainRepository.getGeneric(foreignChainId);
        this.collection[foreignChainId] = ForeignChainContractFactory.create({ blockchain, settings });
      } else {
        const blockchain = blockchainRepository.get(foreignChainId);

        this.collection[foreignChainId] =
          blockchain.provider && blockchain.getContractRegistryAddress()
            ? new ForeignChainContract({ blockchain, settings })
            : undefined;
      }
    });
  }

  get(id: string): ChainContract | ForeignChainContract {
    if (!this.collection[id]) {
      throw Error(`[${id}] chain for ${id} does not exists in ChainContractRepository`);
    }

    if (NonEvmChainsIds.includes(<ChainsIds>id)) {
      throw Error(`[ChainContractRepository] Wrong Blockchain type for ${id}`);
    }

    return <ChainContract | ForeignChainContract>this.collection[id];
  }

  getGeneric(id: string): IGenericForeignChainContract {
    if (!this.collection[id]) {
      throw Error(`[ChainContractRepository] Blockchain ${id} does not exists`);
    }

    if (!NonEvmChainsIds.includes(<ChainsIds>id)) {
      throw Error(`[ChainContractRepository] Wrong Blockchain type for ${id}. Expected GenericBlockchain`);
    }

    return <IGenericForeignChainContract>this.collection[id];
  }
}
