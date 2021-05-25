import { inject, injectable } from 'inversify';
import Settings from '../types/Settings';
import { ethers } from 'ethers';

@injectable()
class Blockchain {
  provider: ethers.providers.Provider;

  constructor(@inject('Settings') settings: Settings) {
    this.provider = ethers.providers.getDefaultProvider(settings.blockchain.provider.url);
  }
}

export default Blockchain;
