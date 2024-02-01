import Settings, { BlockchainBasic } from '../types/Settings';
import { BigNumber, ethers } from 'ethers';

export type BlockchainProps = {
  chainId: string;
  settings: Settings;
};

export class BlockchainScanner {
  readonly chainId!: string;
  readonly settings!: BlockchainBasic;
  readonly provider: ethers.providers.StaticJsonRpcProvider;

  constructor(props: BlockchainProps) {
    const { chainId, settings } = props;

    this.chainId = chainId;
    this.settings = (<Record<string, BlockchainBasic>>settings.blockchain.blockchainScanner)[chainId];

    console.log(`[BlockchainScanner] ${chainId} providerUrl: ${this.settings.providerUrl}`);

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
