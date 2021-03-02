import { Logger } from 'winston';
import { inject, injectable } from 'inversify';
import ValidatorRegistryContract from '../contracts/ValidatorRegistryContract';
import Blockchain from '../lib/Blockchain';
import Block from '../models/Block';
import Leaf from '../models/Leaf';
import SortedMerkleTreeFactory from './SortedMerkleTreeFactory';
import axios from 'axios';
import { BlockFromPegasus } from '../types/BlockFromPegasus';

@injectable()
class LeavesSynchronizer {
  @inject('Logger') logger!: Logger;
  @inject(Blockchain) blockchain!: Blockchain;
  @inject(ValidatorRegistryContract) validatorRegistryContract!: ValidatorRegistryContract;
  @inject(SortedMerkleTreeFactory) sortedMerkleTreeFactory!: SortedMerkleTreeFactory;

  async apply(blockId: string): Promise<boolean> {
    const block = await Block.findOne({ _id: blockId });

    this.logger.info(
      `Synchronizing leaves for block: ${block.id} with ${block.voters.length} voters: - ${block.voters}`
    );

    let success = false;

    for (const voterIndex in block.voters) {
      const voterId = block.voters[voterIndex];
      const validator = await this.validatorRegistryContract.validators(voterId);
      const location = validator['location'];
      const url = new URL(`${location}/blocks/height/${block.height}`);
      this.logger.info(`Resolving leaves from: ${url}`);
      const response = await axios.get<{ data: BlockFromPegasus }>(url.toString());

      if (response.status == 200) {
        if (!response.data || response.data.data === null) {
          this.logger.warn(`Empty response.data.data for: ${url}`);
          continue;
        }

        const input = new Map<string, string>(Object.entries(response.data.data.data));
        const tree = this.sortedMerkleTreeFactory.apply(input);
        const root = tree.getRoot();

        if (root == block.root) {
          await this.updateNumericFCD(block.id, response.data.data.numericFcdKeys, response.data.data.numericFcdValues);

          await input.forEach(async (value: string, key: string) => {
            const proof = tree.getProofForKey(key);

            const leaf = await Leaf.findOneAndUpdate(
              {
                _id: `leaf::${block.id}::${key}`,
                blockId: block.id,
                key: key,
              },
              {
                value: value,
                proof: proof,
              },
              {
                new: true,
                upsert: true,
              }
            );

            this.logger.info(`Created new leaf: ${leaf.id}`);
          });

          success = true;
          break;
        } else {
          this.logger.warn(
            `Validator: ${url} returned non matching tree data; consensus = ${block.root} & validator = ${root}`
          );
        }
      }
    }

    this.logger.info(`Leaf syncing ran with success: ${success}`);
    return success;
  }

  private updateNumericFCD = async (blockId: string, numericFcdKeys: string[], numericFcdValues: number[]) => {
    await Block.findOneAndUpdate(
      { _id: blockId },
      { numericFcdKeys: numericFcdKeys, numericFcdValues: numericFcdValues },
      { new: false, upsert: true }
    );
  };
}

export default LeavesSynchronizer;
