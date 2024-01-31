import { Logger } from 'winston';
import { inject, injectable } from 'inversify';

import { ChainContract } from '../contracts/ChainContract';
import Block, { IBlock } from '../models/Block';
import Leaf from '../models/Leaf';
import LeavesSynchronizer from '../services/LeavesSynchronizer';
import { BlockStatus } from '../types/blocks';
import { ChainInstanceResolver } from './ChainInstanceResolver';
import { ChainStatus } from '../types/ChainStatus';
import RevertedBlockResolver from './RevertedBlockResolver';
import Settings from '../types/Settings';
import { BlockchainRepository } from '../repositories/BlockchainRepository';
import { ChainContractRepository } from '../repositories/ChainContractRepository';
import { ChainsIds } from '../types/ChainsIds';
import { LatestIdsProvider } from './LatestIdsProvider';
import BlockChainData from '../models/BlockChainData';
import { ChainStatusExtended, SETTLED_FULFILLED } from '../types/custom';
import { promiseWithTimeout } from '../utils/promiseWithTimeout';
import { ValidatorRepository } from '../repositories/ValidatorRepository';
import { Validator } from '../types/Validator';

@injectable()
class BlockSynchronizer {
  @inject('Logger') private logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(ChainInstanceResolver) private chainInstanceResolver!: ChainInstanceResolver;
  @inject(LeavesSynchronizer) private leavesSynchronizer!: LeavesSynchronizer;
  @inject(RevertedBlockResolver) revertedBlockResolver!: RevertedBlockResolver;
  @inject(BlockchainRepository) private blockchainRepository!: BlockchainRepository;
  @inject(ValidatorRepository) private validatorRepository!: ValidatorRepository;
  @inject(ChainContractRepository) chainContractRepository: ChainContractRepository;
  @inject(LatestIdsProvider) latestIdsProvider: LatestIdsProvider;

  async apply(): Promise<void> {
    this.logger.debug(`BlockSynchronizer timeout: ${this.settings.jobs.blockCreation.interval}`);

    const chainsChecksDataSettled = await Promise.allSettled(
      Object.values(ChainsIds)
        // Solana is replicating, so we don't want to sync block for it
        .filter((chainId) => chainId != ChainsIds.SOLANA)
        .map((chainId) => promiseWithTimeout(this.checkForRevertedBlocks(chainId), 20_000))
    );

    const chainsChecksData = chainsChecksDataSettled
      .map((data) => (data.status == SETTLED_FULFILLED ? data.value : undefined))
      .filter((data) => !!data);

    if (chainsChecksData.filter((data) => data.reverted).length > 0) {
      this.logger.info('[BlockSynchronizer] return, blocks were reverted');
      return;
    }

    const validators = await this.validatorsList(chainsChecksData);

    if (validators.length === 0) {
      this.noticeError('masterChainStatus failed to fetch validators');
      return;
    }

    const chainStatusNextBlockId = chainsChecksData.reduce((acc, data) => Math.max(acc, data.status.nextBlockId), 0);

    this.logger.info(`Synchronizing blocks with nextBlockId ${chainStatusNextBlockId}`);

    const mongoBlocks = await this.getMongoBlocksToSynchronize();

    if (!mongoBlocks.length) {
      this.logger.info('[BlockSynchronizer] No mongoBlocks to synchronize');
      return;
    }

    this.logger.info(`Got ${mongoBlocks.length} mongoBlocks to synchronize`);

    const [leavesSynchronizationStatuses, blockIds] = await this.processBlocks(
      chainStatusNextBlockId,
      validators,
      mongoBlocks
    );

    if (!blockIds.length) {
      this.logger.info('[BlockSynchronizer] finished.');
      return;
    }

    this.logger.info(`Synchronized leaves for blocks: ${blockIds.join(',')}`);

    const results = await Promise.all(
      leavesSynchronizationStatuses.map(async (leavesSynchronizationStatus, i) => {
        try {
          const status = await leavesSynchronizationStatus;

          const updated = await this.updateSynchronizedBlocks([status], [blockIds[i]]);

          const success = updated.updatedFinalizedBlocks;
          const failed = updated.updatedFailedBlocks;

          return [success, failed];
        } catch (err) {
          this.logger.error(err);

          return [0, 0];
        }
      })
    );

    let totalSuccess = 0;
    let totalFailed = 0;

    for (const [success, failed] of results) {
      totalSuccess += success;
      totalFailed += failed;
    }

    this.logger.info(
      `Finalized successfully/failed: ${totalSuccess}/${totalFailed}. Total: ${totalSuccess + totalFailed}`
    );
  }

  async checkForRevertedBlocks(chainId: ChainsIds): Promise<ChainStatusExtended> {
    this.logger.debug(`[${chainId}] checkForRevertedBlocks`);

    const chain = <ChainContract>this.chainContractRepository.get(chainId);

    const [chainStatus, lastSavedBlockId] = await Promise.all([
      chain.resolveStatus<ChainStatus>(),
      this.latestIdsProvider.getLastSavedBlockId(chainId),
    ]);

    this.logger.debug(`[${chainId}] checkForRevertedBlocks: ${JSON.stringify(chainStatus)}`);

    const reverted = await this.revertedBlockResolver.apply(lastSavedBlockId, chainStatus.nextBlockId, chainId);

    return {
      reverted: reverted > 0,
      status: chainStatus,
      chainId,
    };
  }

  private validatorsList = async (chainsChecksData: ChainStatusExtended[]): Promise<Validator[]> => {
    const masterChainId = this.settings.blockchain.homeChain.chainId;

    // we search for MasterChain, because we need active list of validators
    const masterChainStatus: ChainStatus | undefined = chainsChecksData.filter(
      (data) => data.chainId === masterChainId
    )[0]?.status;

    if (masterChainStatus) {
      const validators: Validator[] = masterChainStatus.validators.map(
        (address, i): Validator => {
          return { id: address, location: masterChainStatus.locations[i], power: masterChainStatus.powers[i] };
        }
      );

      await this.validatorRepository.cache(validators);
      return validators;
    } else {
      this.logger.info(`[${masterChainId}] masterChainStatus failed, using validators cache`);
      return this.validatorRepository.list();
    }
  };

  private getMongoBlocksToSynchronize = async (): Promise<IBlock[]> => {
    const blockChainDatasInProgress = await BlockChainData.find({
      status: { $nin: [BlockStatus.Finalized, BlockStatus.Failed] },
    })
      .sort({ blockId: -1 })
      .limit(this.settings.app.blockSyncBatchSize)
      .exec();

    const blockChainDataBlockIds = blockChainDatasInProgress.map((blockChainData) => blockChainData.blockId);

    const blocksInProgress = await Block.find({
      $or: [
        { status: { $nin: [BlockStatus.Finalized, BlockStatus.Failed] } },
        { blockId: { $in: blockChainDataBlockIds } },
      ],
    })
      .sort({ blockId: -1 })
      .limit(this.settings.app.blockSyncBatchSize)
      .exec();

    const confirmations = Object.values(this.settings.blockchain.multiChains).reduce(
      (acc, s) => Math.max(acc, s.confirmations),
      0
    );

    const blocksToConfirm = await Block.find({
      status: { $in: [BlockStatus.Finalized, BlockStatus.Failed] },
    })
      .sort({ blockId: -1 })
      .limit(confirmations)
      .exec();

    return blocksInProgress.concat(blocksToConfirm);
  };

  private updateSynchronizedBlocks = async (
    leavesSynchronizers: (boolean | null)[],
    blockIds: number[]
  ): Promise<{ updatedFinalizedBlocks: number; updatedFailedBlocks: number }> => {
    const data = leavesSynchronizers.map((success: boolean | null, i: number) => {
      if (success == null) {
        return { status: undefined, blockId: 0 };
      }

      return {
        status: success ? BlockStatus.Finalized : BlockStatus.Failed,
        blockId: blockIds[i],
      };
    });

    const finalized = data.filter((d) => d.status == BlockStatus.Finalized).map((d) => d.blockId);
    const failed = data.filter((d) => d.status == BlockStatus.Failed).map((d) => d.blockId);

    if (failed.length > 0) {
      this.noticeError(`[updateSynchronizedBlocks] Blocks: ${failed.join(',')}: failed`);
    }

    const updateFinalizeBlocks = Block.updateMany(
      { blockId: { $in: finalized } },
      { status: BlockStatus.Finalized },
      { new: false, upsert: true }
    );

    const updateFailedBlocks = Block.updateMany(
      { blockId: { $in: failed } },
      { status: BlockStatus.Failed },
      { new: false, upsert: true }
    );

    const updateFinalizedBlockData = BlockChainData.updateMany(
      { blockId: { $in: finalized } },
      { status: BlockStatus.Finalized },
      { new: false, upsert: true }
    );

    const updateFailedBlockData = BlockChainData.updateMany(
      { blockId: { $in: failed } },
      { status: BlockStatus.Failed },
      { new: false, upsert: true }
    );

    const [updatedFinalizedBlocks, updatedFailedBlocks] = await Promise.all([
      finalized.length == 0 ? undefined : updateFinalizeBlocks,
      failed.length == 0 ? undefined : updateFailedBlocks,
      finalized.length == 0 ? undefined : updateFinalizedBlockData,
      failed.length == 0 ? undefined : updateFailedBlockData,
    ]);

    return {
      updatedFinalizedBlocks: updatedFinalizedBlocks ? updatedFinalizedBlocks.nModified : 0,
      updatedFailedBlocks: updatedFailedBlocks ? updatedFailedBlocks.nModified : 0,
    };
  };

  private verifyProcessedBlock = async (mongoBlock: IBlock): Promise<boolean> => {
    const [blockChainData] = await BlockChainData.find({
      blockId: mongoBlock.blockId,
      chainId: { $ne: ChainsIds.SOLANA }, // solana is replicating, so we don't need to verify
    }).limit(1);

    if (!blockChainData) {
      this.noticeError(`Block ${mongoBlock.blockId} saved without BlockChainData`);
      return false;
    }

    const chainContract = this.chainContractRepository.get(blockChainData.chainId);
    const onChainBlocksData = await chainContract.resolveBlockData(blockChainData.chainAddress, mongoBlock.blockId);

    if (!this.equalRoots(mongoBlock.root, onChainBlocksData.root)) {
      this.logger.warn(
        `Invalid ROOT for blockId ${mongoBlock.blockId}. Expected ${onChainBlocksData.root} but have ${mongoBlock.root}. Reverting.`
      );

      await BlockSynchronizer.revertBlocks(mongoBlock.blockId);
      return true;
    }

    return false;
  };

  private equalRoots = (a: string, b: string): boolean => {
    // backwards compatible check for squashed root
    return a == b || a.slice(0, 58) == b.slice(0, 58);
  };

  private processBlocks = async (
    chainStatusNextBlockId: number,
    rawValidatorList: Validator[],
    mongoBlocks: IBlock[]
  ): Promise<[leavesSynchronizationStatuses: Promise<boolean | null>[], synchronizedIds: number[]]> => {
    const leavesSynchronizationStatuses: Promise<boolean | null>[] = [];
    const blockIds: number[] = [];
    let blocksWereReverted = false;

    await Promise.all(
      <Promise<never>[]>mongoBlocks.map(async (mongoBlock: IBlock) => {
        if (blocksWereReverted) {
          this.logger.info('blocksWereReverted');
          return;
        }

        this.logger.debug(
          `Processing block ${mongoBlock._id} with dataTimestamp: ${mongoBlock.dataTimestamp} and status: ${mongoBlock.status}`
        );

        switch (mongoBlock.status) {
          case BlockStatus.Completed:
            this.logger.info(`Start synchronizing leaves for completed block: ${mongoBlock.blockId}`);
            blockIds.push(mongoBlock.blockId);
            leavesSynchronizationStatuses.push(
              this.leavesSynchronizer.apply(chainStatusNextBlockId, rawValidatorList, mongoBlock._id)
            );
            return;

          case BlockStatus.Finalized:
          case BlockStatus.Failed:
            blocksWereReverted = await this.verifyProcessedBlock(mongoBlock);
            return;

          default:
            this.noticeError(`Block ${mongoBlock._id} with odd status: ${mongoBlock.status}`);
            return;
        }
      })
    );

    return [leavesSynchronizationStatuses, blockIds];
  };

  private static revertBlocks = async (
    blockId: number
  ): Promise<({ ok?: number; n?: number } & { deletedCount?: number })[]> => {
    const condition = { blockId: { $gte: blockId } };
    // we can't have different roots for same blockId, so if we detect invalid root, we're reverting all blockchains
    // blocks will be re-fetched.
    return Promise.all([Block.deleteMany(condition), Leaf.deleteMany(condition), BlockChainData.deleteMany(condition)]);
  };

  private noticeError = (err: string): void => {
    this.logger.error(err);
  };
}

export default BlockSynchronizer;
