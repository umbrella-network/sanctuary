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

  async apply(blockId: string): Promise<boolean> {
    let block = await Block.findOne({_id: blockId});

    this.logger.info(`Synchronizing leaves for block: ${block.id} with ${block.voters.length} voters: - ${block.voters}`);

    let success = false;

    for (let voterIndex in block.voters) {
      const voterId = block.voters[voterIndex];
      console.log(voterId);
      const validator = await this.validatorRegistryContract.validators(voterId);
      const location = validator['location'];
      const url = new URL(`${location}/blocks/height/${block.height}`);
      this.logger.info(`Resolving leaves from: ${url}`);
      const response = await axios.get(url.toString());

      if (response.status == 200) {
        const input = new Map<string, string>(Object.entries(response.data.data.data));
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

          success = true;
          break;
        } else {
          this.logger.warn(`Validator: ${url} returned non matching tree data; consensus = ${block.root} & validator = ${root}`);
        }
      }
    }

    this.logger.info(`Leaf syncing ran with success: ${success}`)
    return success;
  }
}

export default LeavesSynchronizer;
