import { inject, injectable } from 'inversify';
import Settings, {BlockchainSettings} from '../types/Settings';
import {ethers, Wallet} from 'ethers';
import {Logger} from "winston";

@injectable()
class Blockchain {
  @inject('Logger') protected logger!: Logger;
  settings!: Settings;
  providers: Record<string, ethers.providers.Provider> = {};
  wallets: Record<string, Wallet> = {};

  constructor(@inject('Settings') settings: Settings) {
    this.settings = settings;

    Object.keys(settings.blockchain.foreignChain).forEach(key => {
      try {
        const blockchainSettings = (<Record<string, BlockchainSettings>>settings.blockchain.foreignChain)[key];

        this.providers[key] = ethers.providers.getDefaultProvider(blockchainSettings.providerUrl);

        const {replicatorPrivateKey} = settings.blockchain;

        if (replicatorPrivateKey) {
          this.wallets[key] = new Wallet(replicatorPrivateKey, this.providers[key]);
        }
      } catch (e) {
        // lets not stop workers if some is not set up
        this.logger.warn(`issues for ${key} blockchain setup`);
        this.logger.error(e);
      }
    });
  }

  getProvider(chainId = this.settings.blockchain.homeChain.chainId): ethers.providers.Provider {
    return this.providers[chainId];
  }

  async getLastNonce(chainId = this.settings.blockchain.homeChain.chainId): Promise<number> {
    return this.wallets[chainId].getTransactionCount('latest');
  }

  async getBlockNumber(chainId = this.settings.blockchain.homeChain.chainId): Promise<number> {
    return this.providers[chainId].getBlockNumber();
  }

  getContractRegistryAddress(chainId = this.settings.blockchain.homeChain.chainId): string {
    const blockchainSettings = (<Record<string, BlockchainSettings>>this.settings.blockchain.foreignChain)[chainId];
    return blockchainSettings.contractRegistryAddress;
  }

  getBlockchainSettings(chainId = this.settings.blockchain.homeChain.chainId): BlockchainSettings {
    return (<Record<string, BlockchainSettings>>this.settings.blockchain.foreignChain)[chainId];
  }
}

export default Blockchain;
