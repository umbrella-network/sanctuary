import { Logger } from 'winston';
import { inject, injectable } from 'inversify';
import ValidatorRegistryContract from '../contracts/ValidatorRegistryContract';
import Block, { IBlock } from '../models/Block';
import Leaf from '../models/Leaf';
import SortedMerkleTreeFactory from './SortedMerkleTreeFactory';
import axios from 'axios';
import { BlockFromPegasus } from '../types/BlockFromPegasus';
import ChainContract from '../contracts/ChainContract';
import FCD, { IFCD } from '../models/FCD';
import { converters } from '@umb-network/toolbox';

@injectable()
class LeavesSynchronizer {
  @inject('Logger') private logger!: Logger;
  @inject(ChainContract) private chainContract!: ChainContract;
  @inject(ValidatorRegistryContract) private validatorRegistryContract!: ValidatorRegistryContract;
  @inject(SortedMerkleTreeFactory) private sortedMerkleTreeFactory!: SortedMerkleTreeFactory;

  async apply(currentBlockHeight: number, blockId: string): Promise<boolean | null> {
    const block = await Block.findOne({ _id: blockId });

    this.logger.info(
      `Synchronizing leaves for block: ${block.id} with ${block.voters.length} voters: - ${block.voters}`
    );

    let success = false;

    for (const voterId of block.voters) {
      const validator = await this.validatorRegistryContract.validators(voterId);
      const location = validator['location'];
      if (!location) {
        continue;
      }

      const url = new URL(`${location}/blocks/height/${block.height}`);
      this.logger.info(`Resolving leaves from: ${url}`);
      const response = await axios.get<{ data: BlockFromPegasus }>(url.toString());

      if (response.status == 200) {
        if (!response.data || response.data.data === null) {
          this.logger.warn(`Empty response.data.data for ${url}: ${JSON.stringify(response.data)}`);
          continue;
        }

        const input: Map<string, string> = new Map(<[string, string][]>Object.entries(response.data.data.data));
        const tree = this.sortedMerkleTreeFactory.apply(input);
        const root = tree.getRoot();

        if (root == block.root) {
          await this.updateNumericFCD(block, response.data.data.numericFcdKeys);

          await Promise.all(
            [...input.entries()].map(async ([key, value]: [string, string]) => {
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
            })
          );

          success = true;
          break;
        } else {
          this.logger.warn(
            `Validator: ${url} returned non matching tree data; consensus = ${block.root} & validator = ${root}`
          );
        }
      }
    }

    if (!success && currentBlockHeight === block.height) {
      this.logger.debug(`Syncing failed, but this is latest block ${currentBlockHeight}, so lets retry`);
      success = null;
    }

    this.logger.info(`Leaf syncing ran with success: ${success}`);
    return success;
  }

  private updateNumericFCD = async (block: IBlock, numericFcdKeys: string[]): Promise<IFCD[]> => {
    if (numericFcdKeys.length === 0) {
      return [];
    }

    const [values, timestamps] = await this.chainContract.resolveFCDs(block.chainAddress, numericFcdKeys);

    return Promise.all(
      values.map((value, i) =>
        FCD.findOneAndUpdate(
          { _id: numericFcdKeys[i] },
          { dataTimestamp: new Date(timestamps[i].toNumber() * 1000), value: converters.fcdValueToNumber(value) },
          { new: true, upsert: true }
        )
      )
    );
  };
}

export default LeavesSynchronizer;
