import { injectable } from 'inversify';
import { IGenericBlockchain, GenericBlockchainProps } from '../lib/blockchains/IGenericBlockchain';
import { BlockchainScanner } from '../lib/BlockchainScanner';

@injectable()
export class BlockchainScannerFactory {
  static create(props: GenericBlockchainProps): IGenericBlockchain | BlockchainScanner {
    switch (props.chainId) {
      default:
        return new BlockchainScanner(props);
    }
  }
}
