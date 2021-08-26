import { inject, injectable } from 'inversify';
import { BigNumber, Contract } from 'ethers';
import { ABI, ContractRegistry, LeafKeyCoder } from '@umb-network/toolbox';
import { Logger } from 'winston';

import Settings from '../types/Settings';
import Blockchain from '../lib/Blockchain';
import { ChainBlockData, ChainFCDsData } from '../models/ChainBlockData';

@injectable()
export class BaseChainContract {
  @inject('Logger') protected logger!: Logger;

  registry!: ContractRegistry;
  settings!: Settings;
  blockchain!: Blockchain;
  contract!: Contract;

  constructor(@inject('Settings') settings: Settings, @inject(Blockchain) blockchain: Blockchain) {
    this.settings = settings;
    this.blockchain = blockchain;
  }

  async resolveContract(): Promise<BaseChainContract> {
    if (!this.registry) {
      this.registry = new ContractRegistry(
        this.blockchain.provider,
        this.settings.blockchain.contracts.registry.address
      );
    }

    const chainAddress = await this.registry.getAddress(this.settings.blockchain.contracts.chain.name);
    return this.setContract(chainAddress);
  }

  async resolveStatus<T>(): Promise<[address: string, status: T]> {
    const chain = await this.resolveContract();
    return Promise.all([chain.contract.address, chain.contract.getStatus()]);
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
    return this.setContract(chainAddress).contract.getCurrentValues(keys.map((k) => LeafKeyCoder.encode(k)));
  }

  async resolveBlocksCountOffset(chainAddress: string): Promise<number> {
    return this.setContract(chainAddress).contract.blocksCountOffset();
  }

  protected async _assertContract(): Promise<void> {
    if (!this.contract) {
      await this.resolveContract();
    }
  }

  protected setContract = (chainAddress: string): BaseChainContract => {
    this.contract = new Contract(chainAddress, ABI.chainAbi, this.blockchain.provider);
    return this;
  };
}
