import { inject, injectable } from 'inversify';
import Settings from '../types/Settings';
import { ethers } from 'ethers';
import { BaseProvider } from '@ethersproject/providers';

@injectable()
class Blockchain {
  provider: ethers.providers.Provider;

  constructor(@inject('Settings') settings: Settings) {
    this.provider = this.getProvider(settings.blockchain.provider.url);
  }

  getProvider(url: string): BaseProvider {
    return ethers.providers.getDefaultProvider(url);
  }
}

export default Blockchain;
