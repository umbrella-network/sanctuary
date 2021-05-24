import { Logger } from 'winston';
import { inject, injectable } from 'inversify';
import ValidatorRegistryContract from '../contracts/ValidatorRegistryContract';
import Block, { IBlock } from '../models/Block';
import Leaf, { ILeaf } from '../models/Leaf';
import SortedMerkleTreeFactory from './SortedMerkleTreeFactory';
import axios from 'axios';
import { BlockFromPegasus } from '../types/BlockFromPegasus';
import ChainContract from '../contracts/ChainContract';
import FCD, { IFCD } from '../models/FCD';
import { LeafValueCoder, SortedMerkleTree } from '@umb-network/toolbox';
import { ChainStatus } from '../types/ChainStatus';
import { Validator } from '../types/Validator';

@injectable()
class LeavesSynchronizer {
  @inject('Logger') private logger!: Logger;
  @inject(ChainContract) private chainContract!: ChainContract;
  @inject(ValidatorRegistryContract) private validatorRegistryContract!: ValidatorRegistryContract;
  @inject(SortedMerkleTreeFactory) private sortedMerkleTreeFactory!: SortedMerkleTreeFactory;

  async apply(chainStatus: ChainStatus, mongoBlockId: string): Promise<boolean | null> {
    const mongoBlock = await Block.findOne({ _id: mongoBlockId });

    this.logger.info(`Synchronizing leaves for block: ${mongoBlock._id}`);

    let success = false;

    // TODO we can create task for sorting validators in a way, so we have high change of hit minter
    // sorting order should be based on how leader is selected
    const validators = this.chainContract.resolveValidators(chainStatus);

    for (const validator of validators) {
      if (!validator.location) {
        continue;
      }

      success = await this.syncLeavesFromValidator(validator, mongoBlock);

      if (success) {
        break;
      }
    }

    if (!success && chainStatus.nextBlockId === mongoBlock.blockId) {
      this.logger.debug(`Syncing failed, but this is latest block ${chainStatus.nextBlockId}, so lets retry`);
      success = null;
    }

    this.logger.info(`Leaf syncing ran with success: ${success}`);
    return success;
  }

  private syncLeavesFromValidator = async (validator: Validator, mongoBlock: IBlock): Promise<boolean> => {
    if (!validator.location) {
      return false;
    }

    const url = new URL(`${validator.location}/blocks/blockId/${mongoBlock.blockId}`);
    const response = await axios.get<{ data: BlockFromPegasus }>(url.toString());

    if (response.status != 200) {
      this.logger.warn(`Validator ${url} responded with status: ${response.status}`);
      return false;
    }

    if (!response.data || response.data.data === null) {
      this.logger.warn(`Empty response.data.data for ${url}: ${JSON.stringify(response.data)}`);
      return false;
    }

    const resolvedLeaves: Map<string, string> = new Map(<[string, string][]>Object.entries(response.data.data.data));
    const tree = this.sortedMerkleTreeFactory.apply(resolvedLeaves);
    const root = tree.getRoot();

    if (root != mongoBlock.root) {
      this.logger.warn(
        `Validator: ${url} returned non matching tree data; consensus = ${mongoBlock.root} & validator = ${root}`
      );
      return false;
    }

    this.logger.info(`Resolving leaves from: ${url}`);
    const [, , updatedLeaves] = await Promise.all([
      this.updateBlock(mongoBlock, response.data.data),
      this.updateFCD(mongoBlock, response.data.data.fcdKeys),
      this.updateLeaves(resolvedLeaves, tree, mongoBlock.blockId),
    ]);

    this.logger.info(
      `Syncing finished side block with ${updatedLeaves.length} leaves and votes: ${JSON.stringify(
        response.data.data.votes
      )}`
    );

    this.logger.info(`Block ${mongoBlock.blockId} has finished with status: ${mongoBlock.status}`);

    return true;
  };

  private updateBlock = async (block: IBlock, data: BlockFromPegasus): Promise<IBlock> => {
    const votesMap = new Map<string, string>();
    const voters = Object.keys(data.votes);

    voters.forEach((voter: string) => {
      votesMap.set(voter, data.votes[voter]);
    });

    return block.updateOne({
      minter: data.minter,
      staked: data.staked,
      power: data.power,
      votes: votesMap,
      voters: voters,
      anchor: data.anchor,
    });
  };

  private updateFCD = async (block: IBlock, fcdKeys: string[]): Promise<IFCD[]> => {
    if (fcdKeys.length === 0) {
      return [];
    }

    const [values, timestamps] = await this.chainContract.resolveFCDs(block.chainAddress, fcdKeys);

    return Promise.all(
      values.map((value, i) =>
        FCD.findOneAndUpdate(
          { _id: fcdKeys[i] },
          { dataTimestamp: new Date(timestamps[i] * 1000), value: LeafValueCoder.decode(value.toHexString()) },
          { new: true, upsert: true }
        )
      )
    );
  };

  private updateLeaves = async (
    resolvedLeaves: Map<string, string>,
    tree: SortedMerkleTree,
    blockId: number
  ): Promise<void[]> => {
    return Promise.all(
      [...resolvedLeaves.entries()].map(async ([key, value]: [string, string]) => {
        const proof = tree.getProofForKey(key);
        const leaf = await this.createLeaf(proof, blockId, key, value);
        this.logger.debug(`Created new leaf: ${leaf._id}/${leaf.blockId}, ${key} => ${value}`);
      })
    );
  };

  private createLeaf = async (proof: string[], blockId: number, key: string, value: string): Promise<ILeaf> => {
    return Leaf.findOneAndUpdate(
      {
        _id: `block::${blockId}::leaf::${key}`,
        blockId: blockId.toString(10),
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
  };
}
export default LeavesSynchronizer;
