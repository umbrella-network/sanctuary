import { inject, injectable } from 'inversify';
import { Contract } from 'ethers';

import Settings from '../types/Settings';
import Blockchain from '../lib/Blockchain';
import {BaseChainContract} from './BaseChainContract';

@injectable()
export class ForeignChainContract extends BaseChainContract {
  constructor(@inject('Settings') settings: Settings, @inject(Blockchain) blockchain: Blockchain) {
    super(settings, blockchain);
  }

  protected setContract = (chainAddress: string): ForeignChainContract => {
    this.contract = new Contract(chainAddress, 'ABI TODO', this.blockchain.provider);
    return this;
  };
}
