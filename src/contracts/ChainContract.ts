import { inject, injectable } from 'inversify';
import { BigNumber, Contract } from 'ethers';
import { ABI, ContractRegistry } from '@umb-network/toolbox';
import { Logger } from 'winston';

import Settings from '../types/Settings';
import Blockchain from '../lib/Blockchain';
import { ChainBlockData } from '../models/ChainBlockData';

@injectable()
class ChainContract {
  @inject('Logger') private logger!: Logger;

  registry!: ContractRegistry;
  settings!: Settings;
  blockchain!: Blockchain;
  contract!: Contract;

  constructor(@inject('Settings') settings: Settings, @inject(Blockchain) blockchain: Blockchain) {
    this.settings = settings;
    this.blockchain = blockchain;
  }

  async resolveContract(): Promise<ChainContract> {
    if (!this.registry) {
      this.registry = new ContractRegistry(
        this.blockchain.provider,
        this.settings.blockchain.contracts.registry.address
      );
    }

    const chainAddress = await this.registry.getAddress(this.settings.blockchain.contracts.chain.name);
    return this.setContract(chainAddress);
  }

  setContract = (chainAddress: string): ChainContract => {
    this.contract = new Contract(chainAddress, ABI.chainAbi, this.blockchain.provider);
    return this;
  };

  async blocksCountOffset(): Promise<BigNumber> {
    await this._assertContract();
    return this.contract.blocksCountOffset();
  }

  address(): string {
    return this.contract.address;
  }

  async getBlockHeight(): Promise<BigNumber> {
    await this._assertContract();
    return this.contract.getBlockHeight();
  }

  async getBlockVoters(height: number): Promise<string[]> {
    await this._assertContract();
    return this.contract.getBlockVoters(height);
  }

  async resolveBlockVoters(chainAddress: string, height: number): Promise<string[]> {
    return this.setContract(chainAddress).getBlockVoters(height);
  }

  async getBlockVotes(blockHeight: number, voter: string): Promise<BigNumber> {
    await this._assertContract();
    return this.contract.getBlockVotes(blockHeight, voter);
  }

  async resolveBlockVotes(chainAddress: string, blockHeight: number, voter: string): Promise<BigNumber> {
    return this.setContract(chainAddress).getBlockVotes(blockHeight, voter);
  }

  async resolveBlockData(chainAddress: string, blockHeight: number): Promise<ChainBlockData> {
    return this.setContract(chainAddress).contract.getBlockData(blockHeight);
  }

  private async _assertContract(): Promise<void> {
    if (!this.contract) {
      await this.resolveContract();
    }
  }
}

export default ChainContract;
