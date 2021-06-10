import { Logger } from 'winston';
import { inject, injectable } from 'inversify';
import ValidatorRegistryContract from '../contracts/ValidatorRegistryContract';
import Block, { IBlock } from '../models/Block';
import Leaf, { ILeaf } from '../models/Leaf';
import SortedMerkleTreeFactory from './SortedMerkleTreeFactory';
import { BlockFromPegasus } from '../types/blocks';
import ChainContract from '../contracts/ChainContract';
import FCD, { IFCD } from '../models/FCD';
import { LeafValueCoder, loadFeeds, SortedMerkleTree } from '@umb-network/toolbox';
import { ChainStatus } from '../types/ChainStatus';
import { Validator } from '../types/Validator';
import * as url from 'url';
import { callRetry } from '../utils/callRetry';
import Settings from '../types/Settings';

@injectable()
class LeavesSynchronizer {
  @inject('Logger') private logger!: Logger;
  @inject('Settings') private readonly settings: Settings;
  @inject(ChainContract) private chainContract!: ChainContract;
  @inject(ValidatorRegistryContract) private validatorRegistryContract!: ValidatorRegistryContract;
  @inject(SortedMerkleTreeFactory) private sortedMerkleTreeFactory!: SortedMerkleTreeFactory;

  async apply(chainStatus: ChainStatus, mongoBlockId: string): Promise<boolean | null> {
    const mongoBlock = await Block.findOne({ _id: mongoBlockId });

    this.logger.info(`Synchronizing leaves for block: ${mongoBlock._id}`);

    let success = false;
    await Leaf.deleteMany({ blockId: mongoBlock.blockId });

    // lets do a call to minter first
    const validators = this.validatorsList(chainStatus, mongoBlock.minter);

    for (const validator of validators) {
      if (!validator.location) {
        continue;
      }

      try {
        success = await this.syncLeavesFromValidator(validator, mongoBlock);
      } catch (e) {
        this.logger.error(e);
      }

      if (success) {
        break;
      }
    }

    if (!success && chainStatus.nextBlockId === mongoBlock.blockId) {
      this.logger.debug(`Syncing failed, but this is latest block ${chainStatus.nextBlockId}, so lets retry`);
      success = null;
    }

    this.logger.info(`Leaf syncing for ${mongoBlock.blockId} ran with success: ${success}`);
    return success;
  }

  private validatorsList(chainStatus: ChainStatus, minter: string): Validator[] {
    // lets do a call to minter first
    return this.chainContract
      .resolveValidators(chainStatus)
      .sort((a, b) => (a.id === minter ? -1 : b.id === minter ? 1 : 0));
  }

  private syncLeavesFromValidator = async (validator: Validator, mongoBlock: IBlock): Promise<boolean> => {
    const urlForBlockId = url.parse(`${validator.location}/blocks/blockId/${mongoBlock.blockId}`).href;
    this.logger.info(`Resolving leaves from: ${urlForBlockId}`);

    const blockFromPegasus = await this.blockFromValidator(validator, mongoBlock.blockId);

    if (!blockFromPegasus) {
      return false;
    }

    const resolvedLeaves: Map<string, string> = new Map(<[string, string][]>Object.entries(blockFromPegasus.data));
    const tree = this.sortedMerkleTreeFactory.apply(resolvedLeaves);
    const root = tree.getRoot();

    if (root != mongoBlock.root) {
      this.logger.warn(
        `Validator: ${urlForBlockId} returned non matching tree data; consensus = ${mongoBlock.root} & validator = ${root}`
      );

      return false;
    }

    const [, updatedLeaves] = await Promise.all([
      this.updateFCD(mongoBlock),
      this.updateLeaves(resolvedLeaves, tree, mongoBlock.blockId),
    ]);

    this.logger.info(`Resolving finished with ${updatedLeaves.length} leaves and votes: ${mongoBlock.votes.size}`);

    return true;
  };

  private blockFromValidator = async (validator: Validator, blockId: number): Promise<BlockFromPegasus | undefined> => {
    const urlForBlockId = url.parse(`${validator.location}/blocks/blockId/${blockId}`).href;

    try {
      const response = await callRetry(urlForBlockId);

      if (response.status != 200) {
        this.logger.warn(`Validator ${urlForBlockId} responded with status: ${response.status}`);
        return;
      }

      if (!response.data || response.data.data === null) {
        this.logger.warn(`Empty response.data.data for ${urlForBlockId}: ${JSON.stringify(response.data)}`);
        return;
      }

      return (response.data.data as unknown) as BlockFromPegasus;
    } catch (e) {
      this.logger.warn(`Error for block request ${urlForBlockId}: ${e.message}`);
    }
  };

  private updateFCD = async (block: IBlock): Promise<IFCD[]> => {
    const fcdKeys: string[] = [...Object.keys(await loadFeeds(this.settings.app.feedsOnChain))];
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
        this.logger.silly(`Created new leaf: ${leaf._id}/${leaf.blockId}, ${key} => ${value}`);
      })
    );
  };

  private createLeaf = async (proof: string[], blockId: number, key: string, value: string): Promise<ILeaf> => {
    return Leaf.findOneAndUpdate(
      {
        _id: `block::${blockId}::leaf::${key}`,
        blockId: blockId,
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
