import { inject, injectable } from 'inversify';
import { BigNumber, Contract } from 'ethers';
import { ABI, ContractRegistry, LeafKeyCoder } from '@umb-network/toolbox';
import { Logger } from 'winston';

import Settings from '../types/Settings';
import Blockchain from '../lib/Blockchain';
import { ChainBlockData, ChainFCDsData } from '../models/ChainBlockData';
// TODO this abi should came from SDK
import abi from './ForeignChainAbi.json';

@injectable()
export class BaseChainContract {
  @inject('Logger') protected logger!: Logger;

  chainId!: string;
  protected registry!: ContractRegistry;
  protected settings!: Settings;
  protected blockchain!: Blockchain;
  contract!: Contract;

  constructor(@inject('Settings') settings: Settings, @inject(Blockchain) blockchain: Blockchain) {
    this.settings = settings;
    this.blockchain = blockchain;
  }

  setChainId = (chainId: string): BaseChainContract => {
    this.chainId = chainId;
    return this;
  };

  async resolveContract(): Promise<BaseChainContract> {
    if (!this.registry) {
      this.registry = new ContractRegistry(
        this.blockchain.getProvider(this.chainId),
        this.blockchain.getContractRegistryAddress(this.chainId)
      );
    }

    const chainAddress = await this.registry.getAddress(this.settings.blockchain.contracts.chain.name);
    return this.setContract(chainAddress);
  }

  async resolveStatus<T>(): Promise<T> {
    const chain = await this.resolveContract();
    const status = await chain.contract.getStatus();
    return { chainAddress: chain.contract.address, ...status };
  }

  async blocksCountOffset(): Promise<number> {
    await this._assertContract();
    return this.contract.blocksCountOffset();
  }

  address(): string {
    return this.contract.address;
  }

  async getBlockId(): Promise<BigNumber> {
    await this._assertContract();
    return this.contract.getBlockId();
  }

  async resolveBlockData(chainAddress: string, blockId: number): Promise<ChainBlockData> {
    return this.setContract(chainAddress).contract.blocks(blockId);
  }

  async resolveFCDs(chainAddress: string, keys: string[]): Promise<ChainFCDsData> {
    //we resolving from homechain always
    return this.setChainId(this.settings.blockchain.homeChain.chainId).setContract(chainAddress).contract.getCurrentValues(keys.map((k) => LeafKeyCoder.encode(k)));
  }

  async resolveBlocksCountOffset(chainAddress: string): Promise<number> {
    return this.setContract(chainAddress).contract.blocksCountOffset();
  }

  isHomeChain(): boolean {
    return this.chainId === this.settings.blockchain.homeChain.chainId;
  }

  protected async _assertContract(): Promise<void> {
    if (!this.contract) {
      await this.resolveContract();
    }
  }

  protected setContract = (chainAddress: string): BaseChainContract => {
    const chainAbi = this.isHomeChain() ? ABI.chainAbi : abi;
    this.contract = new Contract(chainAddress, chainAbi, this.blockchain.getProvider(this.chainId));
    return this;
  };
}
