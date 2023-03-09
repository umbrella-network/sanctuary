import { inject } from 'inversify';
import { BigNumber, Contract } from 'ethers';
import { ABI, LeafKeyCoder } from '@umb-network/toolbox';
import { Logger } from 'winston';

import Settings from '../types/Settings';
import { Blockchain } from '../lib/Blockchain';
import { ChainBlockData, ChainFCDsData } from '../models/ChainBlockData';
// TODO this abi should came from SDK
import abi from './ForeignChainAbi.json';
import newAbi from './ChainAbi.json';
import { ChainsIds } from '../types/ChainsIds';

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

  async resolveContract(): Promise<BaseChainContract> {
    const chainAddress = await this.registry.getAddressByString(this.settings.blockchain.contracts.chain.name);
    return this.setContract(chainAddress);
  }

  async resolveStatus<T>(): Promise<T> {
    const chain = await this.resolveContract();
    const chainContractStatus = await chain.contract.getStatus();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status: any = {};

    Object.keys(chainContractStatus).forEach((key) => {
      if (Number.isNaN(Number(key))) {
        status[key] = chainContractStatus[key];
      }
    });

    if (this.blockchain.chainId === ChainsIds.ARBITRUM) {
      // block.number on arbitrum is ethereum block number, so we need to override
      status.blockNumber = BigNumber.from(await this.blockchain.getBlockNumber());
    }

    return { chainAddress: chain.contract.address, ...status };
  }

  address = (): string => (this.contract ? this.contract.address : 'N/A');

  async resolveBlockData(chainAddress: string, blockId: number): Promise<ChainBlockData> {
    return this.setContract(chainAddress).contract.blocks(blockId);
  }

  async resolveFCDs(chainAddress: string, keys: string[]): Promise<ChainFCDsData> {
    return this.setContract(chainAddress).contract.getCurrentValues(keys.map((k) => LeafKeyCoder.encode(k)));
  }

  async resolveBlocksCountOffset(chainAddress: string): Promise<number> {
    return this.setContract(chainAddress).contract.blocksCountOffset();
  }

  protected setContract = (chainAddress: string): BaseChainContract => {
    this.contract = new Contract(chainAddress, this.chainAbi(), this.blockchain.getProvider());
    return this;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected chainAbi = (): any => {
    if (
      [ChainsIds.AVALANCHE, ChainsIds.POLYGON, ChainsIds.BSC, ChainsIds.ARBITRUM].includes(
        this.blockchain.chainId as ChainsIds
      )
    ) {
      return newAbi;
    }

    return abi;
  };
}
