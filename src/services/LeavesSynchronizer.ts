import { Logger } from 'winston';
import { inject, injectable } from 'inversify';
import ChainContract from '../contracts/ChainContract';
import ValidatorRegistryContract from '../contracts/ValidatorRegistryContract';
import Blockchain from '../lib/Blockchain';
import Block, { IBlock } from '../models/Block';
import Leaf, { ILeaf } from '../models/Leaf';
import SortedMerkleTreeFactory from './SortedMerkleTreeFactory';
import axios from 'axios';

@injectable()
class LeavesSynchronizer {
  @inject('Logger') logger!: Logger;
  @inject(Blockchain) blockchain!: Blockchain;
  @inject(ValidatorRegistryContract) validatorRegistryContract!: ValidatorRegistryContract;
  @inject(SortedMerkleTreeFactory) sortedMerkleTreeFactory!: SortedMerkleTreeFactory;

  async apply(blockId: string): Promise<void> {
    let block = await Block.findOne({_id: blockId});

    this.logger.info(`Synchronizing leaves for block: ${block.id}`);

    for (let voterId in block.voters) {
      const validator = await this.validatorRegistryContract.validators(voterId);
      const location = validator['location'];
      const url = new URL(`${location}/blocks/${block.height}`);
      this.logger.info(`Resolving leaves from: ${url}`);
      const response = await axios.get(location);

      if (response.status == 200) {
        const input = response.data.data;
        const tree = this.sortedMerkleTreeFactory.apply(input);
        const root = tree.getRoot();

        if (root == block.root) {
          await input.forEach(async (value: string, key: string) => {
            const proof = tree.getProofForKey(key);

            let leaf = await Leaf.findOneAndUpdate(
              {
                 _id: `leaf::${block.id}::${key}`,
                 blockId: block.id,
                 key: key
              }, {
                value: value,
                proof: proof
              }, {
                new: true,
                upsert: true
              }
            );

            this.logger.info(`Created new leaf: ${leaf.id}`);
          });

          break;
        } else {
          this.logger.error(`Validator: ${url} returned non matching tree data`);
        }
      }
    }
  }
}

export default LeavesSynchronizer;
