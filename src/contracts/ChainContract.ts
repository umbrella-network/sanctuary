import { inject, injectable } from 'inversify';

import Settings from '../types/Settings';
import Blockchain from '../lib/Blockchain';
import { Validator } from '../types/Validator';
import { ChainStatus } from '../types/ChainStatus';
import {BaseChainContract} from './BaseChainContract';

@injectable()
class ChainContract extends BaseChainContract {
  // constructor(@inject('Settings') settings: Settings, @inject(Blockchain) blockchain: Blockchain) {
  //   super(settings.blockchain.homeChainId, settings, blockchain);
  // }
  
  resolveValidators(chainStatus: ChainStatus): Validator[] {
    return chainStatus.validators.map((address, i) => {
      return {
        id: address,
        location: chainStatus.locations[i],
        power: chainStatus.powers[i],
      };
    });
  }
}

export default ChainContract;
