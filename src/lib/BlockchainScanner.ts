import { BigNumber, ethers } from 'ethers';
import Settings, { OnChainScannerSettings } from '../types/Settings';

export type BlockchainProps = {
  chainId: string;
  settings: Settings;
};

export class BlockchainScanner {
  readonly chainId!: string;
  readonly settings!: OnChainScannerSettings;
  readonly provider: ethers.providers.StaticJsonRpcProvider;

  constructor(props: BlockchainProps) {
    const { chainId, settings } = props;

    this.chainId = chainId;
    this.settings = (<Record<string, OnChainScannerSettings>>settings.blockchain.blockchainScanner)[chainId];

    if (!this.settings.providerUrl) {
      return;
    }

    if (!this.settings.contractRegistryAddress) {
      throw Error(`[BlockchainScanner] missing contractRegistryAddress for ${chainId}`);
    }

    this.provider = new ethers.providers.StaticJsonRpcProvider(this.settings.providerUrl);
  }

  getProvider(): ethers.providers.Provider {
    return this.provider;
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
