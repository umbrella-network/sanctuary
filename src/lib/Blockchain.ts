import { inject, injectable } from 'inversify';
import Settings, { BlockchainSettings } from '../types/Settings';
import { ethers, Wallet } from 'ethers';

@injectable()
class Blockchain {
  settings!: Settings;
  providers: Record<string, ethers.providers.Provider> = {};
  wallets: Record<string, Wallet> = {};

  constructor(@inject('Settings') settings: Settings) {
    this.settings = settings;

    const { replicatorPrivateKey } = settings.blockchain;

    Object.keys(settings.blockchain.multiChains).forEach((key) => {
      const blockchainSettings = (<Record<string, BlockchainSettings>>settings.blockchain.multiChains)[key];

      if (!blockchainSettings.providerUrl) {
        return;
      }

      this.providers[key] = ethers.providers.getDefaultProvider(blockchainSettings.providerUrl);

      if (replicatorPrivateKey) {
        this.wallets[key] = new Wallet(replicatorPrivateKey, this.providers[key]);
      }
    });
  }

  getProvider(chainId?: string): ethers.providers.Provider {
    chainId ||= this.settings.blockchain.homeChain.chainId;
    return this.providers[chainId];
  }

  async getLastNonce(chainId?: string): Promise<number> {
    chainId ||= this.settings.blockchain.homeChain.chainId;
    return this.wallets[chainId].getTransactionCount('latest');
  }

  async getBlockNumber(chainId?: string): Promise<number> {
    chainId ||= this.settings.blockchain.homeChain.chainId;
    return this.providers[chainId].getBlockNumber();
  }

  getContractRegistryAddress(chainId?: string): string {
    return this.getBlockchainSettings(chainId)?.contractRegistryAddress;
  }

  getBlockchainSettings = (chainId?: string): BlockchainSettings | undefined => {
    chainId ||= this.settings.blockchain.homeChain.chainId;
    return (<Record<string, BlockchainSettings>>this.settings.blockchain.multiChains)[chainId];
  };
}

export default Blockchain;
