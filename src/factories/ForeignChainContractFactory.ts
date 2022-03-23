import { injectable } from 'inversify';
import { ChainsIds } from '../types/ChainsIds';
import {
  IGenericForeignChainContract,
  GenericForeignChainContractProps,
} from '../contracts/generic/IGenericForeignChainContract';
import { ForeignChainContract } from '../contracts/ForeignChainContract';
import { BaseChainContractProps } from '../contracts/BaseChainContract';
import { SolanaForeignChainContract } from '../contracts/generic/SolanaForeignChainContract';

@injectable()
export class ForeignChainContractFactory {
  static create(
    props: GenericForeignChainContractProps | BaseChainContractProps
  ): IGenericForeignChainContract | ForeignChainContract {
    if (!props.blockchain) {
      return undefined;
    }

    switch (props.blockchain.chainId) {
      case ChainsIds.SOLANA:
        return new SolanaForeignChainContract(<GenericForeignChainContractProps>props);
      default:
        return props.blockchain.provider && props.blockchain.getContractRegistryAddress()
          ? new ForeignChainContract(<BaseChainContractProps>props)
          : undefined;
    }
  }
}
