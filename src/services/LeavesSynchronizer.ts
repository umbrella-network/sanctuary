import { Logger } from 'winston';
import { inject, injectable } from 'inversify';
import StakingBankContract from '../contracts/StakingBankContract';
import Block, { IBlock } from '../models/Block';
import Leaf, { ILeaf } from '../models/Leaf';
import SortedMerkleTreeFactory from './SortedMerkleTreeFactory';
import { BlockFromPegasus } from '../types/blocks';
import { ChainContract } from '../contracts/ChainContract';
import { SortedMerkleTree } from '@umb-network/toolbox';
import { ChainStatus } from '../types/ChainStatus';
import { Validator } from '../types/Validator';
import * as url from 'url';
import { callRetry } from '../utils/callRetry';
import Settings from '../types/Settings';
import { ChainContractRepository } from '../repositories/ChainContractRepository';
import { FCDRepository } from '../repositories/FCDRepository';
import { TimeService } from './TimeService';
import { ChainsIds } from '../types/ChainsIds';
import BlockChainData from '../models/BlockChainData';

@injectable()
class LeavesSynchronizer {
  @inject('Logger') private logger!: Logger;
  @inject('Settings') private readonly settings: Settings;
  @inject(StakingBankContract) private stakingBankContract!: StakingBankContract;
  @inject(SortedMerkleTreeFactory) private sortedMerkleTreeFactory!: SortedMerkleTreeFactory;
  @inject(FCDRepository) private fcdRepository!: FCDRepository;
  @inject(ChainContractRepository) private chainContractRepository!: ChainContractRepository;

  private homeChainContract!: ChainContract;

  constructor(
    @inject('Settings') settings: Settings,
    @inject(ChainContractRepository) chainContractRepository: ChainContractRepository
  ) {
    this.homeChainContract = <ChainContract>chainContractRepository.get(settings.blockchain.homeChain.chainId);
  }

  async apply(chainStatus: ChainStatus, mongoBlockId: string): Promise<boolean | null> {
    let success = false;
    const savedBlock = await Block.findOne({ _id: mongoBlockId });

    const savedBlockData = await BlockChainData.findOne({
      blockId: savedBlock.blockId,
      chainId: { $ne: ChainsIds.SOLANA },
    });

    if (!savedBlockData) {
      this.logger.debug(`block: ${savedBlock._id} present only on solana`);
    }

    this.logger.info(`Synchronizing leaves for block: ${savedBlock._id}`);
    await Leaf.deleteMany({ blockId: savedBlock.blockId });
    const validators = this.validatorsList(chainStatus, savedBlockData ? savedBlockData.minter : '');

    for (const validator of validators) {
      if (!validator.location) {
        continue;
      }

      try {
        success = await this.syncLeavesFromValidator(validator, savedBlock);
      } catch (e) {
        this.logger.error(e);
      }

      if (success) {
        break;
      }
    }

    if (!success && chainStatus.nextBlockId === savedBlock.blockId) {
      this.logger.debug(`Syncing failed, but this is latest block ${chainStatus.nextBlockId}, so lets retry`);
      success = null;
    }

    this.logger.info(`Leaf syncing for ${savedBlock.blockId} ran with success: ${success}`);
    return success;
  }

  private validatorsList(chainStatus: ChainStatus, minter: string): Validator[] {
    // lets do a call to minter first
    return this.homeChainContract
      .resolveValidators(chainStatus)
      .sort((a, b) => (a.id === minter ? -1 : b.id === minter ? 1 : 0));
  }

  private syncLeavesFromValidator = async (validator: Validator, savedBlock: IBlock): Promise<boolean> => {
    const urlForBlockId = url.parse(`${validator.location}/blocks/blockId/${savedBlock.blockId}`).href;
    this.logger.info(`Resolving leaves from: ${urlForBlockId}`);
    const blocksFromValidator = await this.blocksFromValidator(validator, savedBlock.blockId);

    if (!blocksFromValidator || !blocksFromValidator.length) {
      return false;
    }

    for (const blockFromValidator of blocksFromValidator) {
      const [success, root] = await this.processBlockFromValidator(blockFromValidator, savedBlock);
      if (success) return true;

      this.logger.warn('Validator returned non matching tree data', {
        urlForBlockId,
        consensus: savedBlock.root,
        validator: root,
      });
    }

    return false;
  };

  private processBlockFromValidator = async (
    blockFromValidator: BlockFromPegasus,
    savedBlock: IBlock
  ): Promise<[boolean, string]> => {
    const resolvedLeaves: Map<string, string> = new Map(<[string, string][]>Object.entries(blockFromValidator.data));
    const tree = this.sortedMerkleTreeFactory.apply(resolvedLeaves);
    const root = tree.getRoot();

    if (root != savedBlock.root) {
      this.logger.info(`checking squashedRoot for backwards compatibility for block ${savedBlock.blockId}`);
      const squashedRoot = tree.getRoot(TimeService.msToSec(savedBlock.dataTimestamp.getTime()));
      if (squashedRoot != savedBlock.root) return [false, squashedRoot];
    }

    const updatedLeaves = await this.updateLeaves(resolvedLeaves, tree, savedBlock.blockId);

    this.logger.info(
      `Resolving finished for ${savedBlock.blockId} with ${updatedLeaves.length} leaves and votes: ${savedBlock.votes.size}`
    );

    return [true, root];
  };

  private blocksFromValidator = async (
    validator: Validator,
    blockId: number
  ): Promise<BlockFromPegasus[] | undefined> => {
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

      return (response.data.data as unknown) as BlockFromPegasus[];
    } catch (e) {
      this.logger.warn(`Error for block request ${urlForBlockId}: ${e.message}`);
    }
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
