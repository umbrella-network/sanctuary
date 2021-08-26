import { inject, injectable } from 'inversify';
import { Contract } from 'ethers';

import Settings from '../types/Settings';
import Blockchain from '../lib/Blockchain';
import {BaseChainContract} from './BaseChainContract';

// TODO this abi should came from SDK
import abi from './ForeignChainAbi.json';

@injectable()
export class ForeignChainContract extends BaseChainContract {
  constructor(@inject('Settings') settings: Settings, @inject(Blockchain) blockchain: Blockchain) {
    super(settings, blockchain);
  }

  protected setContract = (chainAddress: string): ForeignChainContract => {
    this.contract = new Contract(chainAddress, abi, this.blockchain.provider);
    return this;
  };
}
