import { inject, injectable } from 'inversify';
import Settings from '../types/Settings';
import {ethers, Wallet} from 'ethers';
import { BaseProvider } from '@ethersproject/providers';

@injectable()
class Blockchain {
  provider: ethers.providers.Provider;
  wallet: Wallet;

  constructor(@inject('Settings') settings: Settings) {
    this.provider = this.getProvider(settings.blockchain.provider.url);
    this.wallet = new Wallet(settings.blockchain.provider.privateKey, this.provider);
  }

  getProvider(url: string): BaseProvider {
    return ethers.providers.getDefaultProvider(url);
  }

  async getLastNonce(): Promise<number> {
    return this.wallet.getTransactionCount('latest');
  }
}

export default Blockchain;
