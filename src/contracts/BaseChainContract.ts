import { inject } from 'inversify';
import { Contract } from 'ethers';
import { ABI, LeafKeyCoder } from '@umb-network/toolbox';
import { Logger } from 'winston';

import Settings from '../types/Settings';
import { Blockchain } from '../lib/Blockchain';
import { ChainBlockData, ChainFCDsData } from '../models/ChainBlockData';
// TODO this abi should came from SDK
import abi from './ForeignChainAbi.json';

export type BaseChainContractProps = {
  blockchain: Blockchain;
  settings: Settings;
};

export abstract class BaseChainContract {
  @inject('Logger') protected logger!: Logger;

  protected registry!: Contract;
  protected settings!: Settings;
  protected blockchain!: Blockchain;
  contract!: Contract;

  constructor(props: BaseChainContractProps) {
    this.blockchain = props.blockchain;
    this.settings = props.settings;

    const registryAddress = this.blockchain.getContractRegistryAddress();
    this.registry = new Contract(registryAddress, ABI.registryAbi, this.blockchain.getProvider());
  }

  resolveContract = async (): Promise<BaseChainContract> => {
    const chainAddress = await this.registry.getAddressByString(this.settings.blockchain.contracts.chain.name);
    return this.setContract(chainAddress);
  };

  resolveStatus = async <T>(): Promise<T> => {
    const chain = await this.resolveContract();
    const status = await chain.contract.getStatus();
    return { chainAddress: chain.contract.address, ...status };
  };

  blocksCountOffset = async (): Promise<number> => {
    await this._assertContract();
    return this.contract.blocksCountOffset();
  };

  address = (): string => this.contract.address;

  resolveBlockData = async (chainAddress: string, blockId: number): Promise<ChainBlockData> => {
    return this.setContract(chainAddress).contract.blocks(blockId);
  };

  resolveFCDs = async (chainAddress: string, keys: string[]): Promise<ChainFCDsData> => {
    //we resolving from homechain always
    if (!this.blockchain.isHomeChain) {
      throw Error('I think we using this only to resolve FCD from home chain');
    }

    return this.setContract(chainAddress).contract.getCurrentValues(keys.map((k) => LeafKeyCoder.encode(k)));
  };

  resolveBlocksCountOffset = async (chainAddress: string): Promise<number> => {
    return this.setContract(chainAddress).contract.blocksCountOffset();
  };

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
