import { inject, injectable } from 'inversify';
import Settings, {BlockchainSettings} from '../types/Settings';
import {ethers, Wallet} from 'ethers';

@injectable()
class Blockchain {
  settings!: Settings;
  providers: Record<string, ethers.providers.Provider> = {};
  wallets: Record<string, Wallet> = {};

  constructor(@inject('Settings') settings: Settings) {
    this.settings = settings;

    Object.keys(settings.blockchain.multichain).forEach(key => {
      const blockchainSettings = (<Record<string, BlockchainSettings>>settings.blockchain.multichain)[key];

      this.providers[key] = ethers.providers.getDefaultProvider(blockchainSettings.providerUrl);
      this.wallets[key] = new Wallet(settings.blockchain.replicatorPrivateKey, this.providers[key]);
    });
  }

  getProvider(chainId = this.settings.blockchain.homeChainId): ethers.providers.Provider {
    return this.providers[chainId];
  }

  async getLastNonce(chainId = this.settings.blockchain.homeChainId): Promise<number> {
    return this.wallets[chainId].getTransactionCount('latest');
  }

  async getBlockNumber(chainId = this.settings.blockchain.homeChainId): Promise<number> {
    return this.providers[chainId].getBlockNumber();
  }

  getContractRegistryAddress(chainId = this.settings.blockchain.homeChainId): string {
    const blockchainSettings = (<Record<string, BlockchainSettings>>this.settings.blockchain.multichain)[chainId];
    return blockchainSettings.contractRegistryAddress;
  }

  getBlockchainSettings(chainId = this.settings.blockchain.homeChainId): BlockchainSettings {
    return (<Record<string, BlockchainSettings>>this.settings.blockchain.multichain)[chainId];
  }
}

export default Blockchain;
