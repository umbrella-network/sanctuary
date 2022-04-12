import { injectable } from 'inversify';
import { ChainsIds } from '../types/ChainsIds';
import { IGenericBlockchain, GenericBlockchainProps } from '../lib/blockchains/IGenericBlockchain';
import { Blockchain } from '../lib/Blockchain';
import { SolanaBlockchain } from '../lib/blockchains/SolanaBlockchain';

@injectable()
export class BlockchainFactory {
  static create(props: GenericBlockchainProps): IGenericBlockchain | Blockchain {
    switch (props.chainId) {
      case ChainsIds.SOLANA:
        return new SolanaBlockchain(props);
      default:
        return new Blockchain(props);
    }
  }
}
