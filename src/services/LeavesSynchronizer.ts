import { Logger } from 'winston';
import { inject, injectable } from 'inversify';
import ChainContract from '../contracts/ChainContract';
import ValidatorRegistryContract from '../contracts/ValidatorRegistryContract';
import Blockchain from '../lib/Blockchain';
import Block, { IBlock } from '../models/Block';
import axios from 'axios';

@injectable()
class LeavesSynchronizer {
  @inject('Logger') logger!: Logger;
  @inject(Blockchain) blockchain!: Blockchain;
  @inject(ValidatorRegistryContract) validatorRegistryContract!: ValidatorRegistryContract;

  async apply(blockId: String): Promise<void> {
    let block = await Block.findOne({_id: blockId});

    this.logger.info(`Synchronizing leaves for block: ${block.id}`);

    for (let voterId in block.voters) {
      const validator = await this.validatorRegistryContract.validators(voterId);
      const location = validator['location'];
      const url = new URL(`${location}/blocks/${block.height}`);
      this.logger.info(`Resolving leaves from: ${url}`);
      const response = await axios.get(location);

      if (response.status == 200) {
        
        break;
      }
    }
  }
}

export default LeavesSynchronizer;
