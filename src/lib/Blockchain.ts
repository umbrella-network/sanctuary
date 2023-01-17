import Settings, { BlockchainSettings } from '../types/Settings';
import { BigNumber, ethers, Wallet } from 'ethers';

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

    console.log(`[${chainId}] providerUrl: ${this.settings.providerUrl}`);

    if (!this.settings.providerUrl) {
      return;
    }

    if (!this.settings.contractRegistryAddress) {
      throw Error(`missing contractRegistryAddress for ${chainId}`);
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

  async balanceOf(address: string): Promise<BigNumber> {
    return this.provider.getBalance(address);
  }

  getContractRegistryAddress(): string {
    return this.settings.contractRegistryAddress;
  }
}
