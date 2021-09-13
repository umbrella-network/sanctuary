import { injectable } from 'inversify';

import { Validator } from '../types/Validator';
import { ChainStatus } from '../types/ChainStatus';
import { BaseChainContract } from './BaseChainContract';

@injectable()
class ChainContract extends BaseChainContract {
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
