import { injectable } from 'inversify';
import { ChainsIds } from '../types/ChainsIds';
import { ForeignChainContract } from '../contracts/ForeignChainContract';
import { BaseChainContractProps } from '../contracts/BaseChainContract';
import { SolanaForeignChainContract } from '../contracts/generic/SolanaForeignChainContract';

import {
  IGenericForeignChainContract,
  GenericForeignChainContractProps,
} from '../contracts/generic/IGenericForeignChainContract';

@injectable()
export class ForeignChainContractFactory {
  static create(
    props: GenericForeignChainContractProps | BaseChainContractProps
  ): IGenericForeignChainContract | ForeignChainContract | undefined | null {
    if (!props.blockchain) {
      return undefined;
    }

    switch (props.blockchain.chainId) {
      case ChainsIds.SOLANA:
        return new SolanaForeignChainContract(<GenericForeignChainContractProps>props);
      default:
        if (props.blockchain.provider && props.blockchain.getContractRegistryAddress()) {
          return new ForeignChainContract(<BaseChainContractProps>props);
        }

        return null;
    }
  }
}
