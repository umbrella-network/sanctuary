import { inject, injectable } from 'inversify';
import { Contract } from 'ethers';
import { ABI, LeafKeyCoder } from '@umb-network/toolbox';
import { Logger } from 'winston';

import Settings from '../types/Settings';
import { Blockchain } from '../lib/Blockchain';
import { ChainBlockData, ChainFCDsData } from '../models/ChainBlockData';
// TODO this abi should came from SDK
import abi from './ForeignChainAbi.json';
import { BlockchainRepository } from '../repositories/BlockchainRepository';

@injectable()
export class BaseChainContract {
  @inject('Logger') protected logger!: Logger;
  @inject(BlockchainRepository) protected blockchainRepository!: BlockchainRepository;

  protected registry!: Contract;
  protected settings!: Settings;
  protected blockchain!: Blockchain;
  contract!: Contract;

  constructor(@inject('Settings') settings: Settings) {
    this.settings = settings;
  }

  setChainId = (chainId: string): BaseChainContract => {
    this.blockchain = this.blockchainRepository.get(chainId);
    return this;
  };

  async resolveContract(): Promise<BaseChainContract> {
    if (!this.registry) {
      const registryAddress = this.blockchain.getContractRegistryAddress();
      this.registry = new Contract(registryAddress, ABI.registryAbi, this.blockchain.getProvider());
    }

    const chainAddress = await this.registry.getAddressByString(this.settings.blockchain.contracts.chain.name);
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

  async resolveBlockData(chainAddress: string, blockId: number): Promise<ChainBlockData> {
    return this.setContract(chainAddress).contract.blocks(blockId);
  }

  async resolveFCDs(chainAddress: string, keys: string[]): Promise<ChainFCDsData> {
    //we resolving from homechain always
    if (!this.blockchain.isHomeChain) {
      throw Error('I think we using this only to resolve FCD from home chain');
    }

    return this.setContract(chainAddress).contract.getCurrentValues(keys.map((k) => LeafKeyCoder.encode(k)));
  }

  async resolveBlocksCountOffset(chainAddress: string): Promise<number> {
    return this.setContract(chainAddress).contract.blocksCountOffset();
  }

  protected _assertContract = async (): Promise<void> => {
    if (!this.contract) {
      await this.resolveContract();
    }
  };

  protected setContract = (chainAddress: string): BaseChainContract => {
    const chainAbi = this.blockchain.isHomeChain ? ABI.chainAbi : abi;
    this.contract = new Contract(chainAddress, chainAbi, this.blockchain.getProvider());
    return this;
  };
}
