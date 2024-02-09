import { inject, injectable } from 'inversify';
import { IGenericBlockchain } from '../lib/blockchains/IGenericBlockchain';
import Settings from '../types/Settings';
import { ChainsIds, NonEvmChainsIds } from '../types/ChainsIds';
import { BlockchainScannerFactory } from '../factories/BlockchainScannerFactory';
import { BlockchainScanner } from '../lib/BlockchainScanner';

export type BlockchainCollection = {
  [key: string]: BlockchainScanner | IGenericBlockchain;
};

@injectable()
export class BlockchainScannerRepository {
  private collection: BlockchainCollection = {};

  constructor(@inject('Settings') settings: Settings) {
    Object.keys(settings.blockchain.blockchainScanner).forEach((chainId) => {
      this.collection[chainId] = BlockchainScannerFactory.create({ chainId: chainId as ChainsIds, settings });
    });
  }

  get(id: string): BlockchainScanner {
    if (!this.collection[id]) {
      throw Error(`[BlockchainScannerRepository] BlockchainScanner ${id} does not exists`);
    }

    if (NonEvmChainsIds.includes(<ChainsIds>id)) {
      throw Error(`[BlockchainScannerRepository] Wrong BlockchainScanner type for ${id}`);
    }

    return <BlockchainScanner>this.collection[id];
  }
}
