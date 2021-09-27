import Settings, { BlockchainSettings } from '../types/Settings';
import { ethers, Wallet } from 'ethers';

export type BlockchainProps = {
  chainId: string;
  settings: Settings;
};

export class Blockchain {
  readonly chainId!: string;
  readonly isHomeChain!: boolean;
  readonly settings!: BlockchainSettings;
  readonly provider: ethers.providers.Provider;
  readonly wallet: Wallet;

  constructor(props: BlockchainProps) {
    const { chainId, settings } = props;

    this.chainId = chainId;
    this.isHomeChain = chainId === settings.blockchain.homeChain.chainId;
    this.settings = (<Record<string, BlockchainSettings>>settings.blockchain.multiChains)[chainId];

    if (!this.settings.providerUrl) {
      return;
    }

    this.provider = ethers.providers.getDefaultProvider(this.settings.providerUrl);

    if (settings.blockchain.replicatorPrivateKey) {
      this.wallet = new Wallet(settings.blockchain.replicatorPrivateKey, this.provider);
    }
  }

  getProvider(): ethers.providers.Provider {
    return this.provider;
  }

  async getLastNonce(): Promise<number> {
    return this.wallet.getTransactionCount('latest');
  }

  async getBlockNumber(): Promise<number> {
    return this.provider.getBlockNumber();
  }

  getContractRegistryAddress(): string {
    return this.settings.contractRegistryAddress;
  }
}
