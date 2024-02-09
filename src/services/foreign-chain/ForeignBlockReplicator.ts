import { inject, injectable, postConstruct } from 'inversify';
import { Logger } from 'winston';

import { FeedValue } from '@umb-network/toolbox/dist/types/Feed';
import { LeafKeyCoder, LeafValueCoder, TxSender } from '@umb-network/toolbox';
import { TransactionRequest } from '@ethersproject/abstract-provider/src.ts';
import { TransactionReceipt } from '@ethersproject/providers';

import Block, { IBlock } from '../../models/Block';
import BlockChainData, { IBlockChainData } from '../../models/BlockChainData';

import { ForeignChainStatus } from '../../types/ForeignChainStatus';
import { BlockStatus } from '../../types/blocks';

import { ForeignChainContract } from '../../contracts/ForeignChainContract';
import { ChainContract } from '../../contracts/ChainContract';

import { IForeignBlockReplicator } from './IForeignBlockReplicator';
import Settings, { BlockchainSettings } from '../../types/Settings';
import { Blockchain } from '../../lib/Blockchain';
import { FailedTransactionEvent } from '../../constants/ReportedMetricsEvents';
import RevertedBlockResolver from '../RevertedBlockResolver';
import { BlockchainRepository } from '../../repositories/BlockchainRepository';
import { ChainContractRepository } from '../../repositories/ChainContractRepository';
import { FCDRepository, FetchedFCDs } from '../../repositories/FCDRepository';
import { TimeService } from '../TimeService';
import { ChainsIds } from '../../types/ChainsIds';

export type ReplicationStatus = {
  blocks?: IBlock[];
  fcds?: FetchedFCDs[];
  anchors?: number[];
  errors?: string[];
};

@injectable()
export abstract class ForeignBlockReplicator implements IForeignBlockReplicator {
  @inject('Logger') protected logger!: Logger;
  @inject(ChainContractRepository) chainContractRepository: ChainContractRepository;
  @inject('Settings') settings: Settings;
  @inject(RevertedBlockResolver) reveredBlockResolver!: RevertedBlockResolver;
  @inject(BlockchainRepository) blockchainRepository!: BlockchainRepository;
  @inject(FCDRepository) fcdRepository!: FCDRepository;

  readonly chainId!: string;
  protected txSender!: TxSender;
  protected blockchain!: Blockchain;
  protected homeBlockchain!: Blockchain;
  protected homeChainContract!: ChainContract;
  protected foreignChainContract!: ForeignChainContract;

  @postConstruct()
  protected setup(): void {
    this.homeBlockchain = this.blockchainRepository.get(this.settings.blockchain.homeChain.chainId);
    this.blockchain = this.blockchainRepository.get(this.chainId);

    if (!this.blockchain.provider) {
      // this post construct can be executed in scheduler
      return;
    }

    this.txSender = new TxSender({
      wallet: this.blockchain.wallet,
      chainId: this.chainId,
      waitForBlockTime: this.blockchain.settings.transactions.waitForBlockTime,
    });

    this.homeChainContract = <ChainContract>(
      this.chainContractRepository.get(this.settings.blockchain.homeChain.chainId)
    );

    this.foreignChainContract = <ForeignChainContract>this.chainContractRepository.get(this.chainId);
  }

  getStatus = async (): Promise<ForeignChainStatus> => {
    return this.foreignChainContract.resolveStatus<ForeignChainStatus>();
  };

  resolvePendingBlocks = async (status: ForeignChainStatus, currentDate: Date): Promise<IBlock[]> => {
    if (!this.canMint(status, TimeService.msToSec(currentDate.getTime()))) {
      return [];
    }

    const lastForeignBlock = await this.latestForeignBlock();

    if (await this.checkForRevertedBlocks(status, lastForeignBlock)) {
      return [];
    }

    const blocks = await this.blocksForReplication(status);

    if (!this.verifyBlocksForReplication(blocks, status)) {
      return [];
    }

    if (status.lastDataTimestamp === 0) {
      return blocks;
    }

    if (!lastForeignBlock || lastForeignBlock.blockId !== status.lastId) {
      // in theory this can happen if we submit block but mongo will not be able to save it
      this.noticeError(
        `[${this.chainId}] Detected missing block ${status.lastId}, not present in DB, last blockId in DB: ${lastForeignBlock?.blockId}`
      );
    }

    return blocks;
  };

  replicate = async (blocks: IBlock[], status: ForeignChainStatus): Promise<ReplicationStatus> => {
    if (blocks.length === 0) return {};
    if (blocks.length > 1) return { errors: [`[${this.chainId}] we support only one block at a time`] };

    const [block] = blocks;

    const fetchedFCDs = await this.fcdRepository.findFCDsForReplication(block);

    if (!fetchedFCDs.keys.length) {
      this.logger.warn(`[${this.chainId}] No FCDs found for replication`);
    } else {
      this.logger.info(`[${this.chainId}] replicating ${fetchedFCDs.keys.length} FCDs`);
    }

    const receipt = await this.replicateBlock(
      block.dataTimestamp,
      block.root,
      fetchedFCDs.keys,
      fetchedFCDs.values,
      block.blockId,
      status
    );

    if (receipt) {
      this.logger.info(
        `[${this.chainId}] block ${block.blockId} replicated with success at tx: ${receipt.transactionHash}`
      );
    } else {
      return { errors: [`[${this.chainId}] Unable to send tx for blockId ${block.blockId}`] };
    }

    if (receipt.status === 1) {
      return {
        blocks: [block],
        fcds: [fetchedFCDs],
        anchors: [receipt.blockNumber],
      };
    }

    return { errors: [`[${this.chainId}] Tx for blockId ${block.blockId} failed`] };
  };

  protected async checkForRevertedBlocks(
    status: ForeignChainStatus,
    lastForeignBlock: IBlockChainData
  ): Promise<boolean> {
    if (!lastForeignBlock) {
      return false;
    }

    return (await this.reveredBlockResolver.apply(lastForeignBlock.blockId, status.nextBlockId, this.chainId)) > 0;
  }

  protected canMint = (chainStatus: ForeignChainStatus, dataTimestamp: number): boolean => {
    const [ready, error] = this.chainReadyForNewBlock(chainStatus, dataTimestamp);
    error && this.logger.info(error);
    return ready;
  };

  protected chainReadyForNewBlock = (
    chainStatus: ForeignChainStatus,
    newDataTimestamp: number
  ): [ready: boolean, error: string | undefined] => {
    if (chainStatus.lastDataTimestamp + chainStatus.timePadding > newDataTimestamp) {
      return [false, `[${this.chainId}] skipping ${chainStatus.nextBlockId.toString()}: waiting for next round`];
    }

    if (newDataTimestamp <= chainStatus.lastDataTimestamp) {
      return [
        false,
        `[${this.chainId}] skipping ${chainStatus.nextBlockId.toString()}, can NOT submit older data ${
          chainStatus.lastDataTimestamp
        } vs ${newDataTimestamp}`,
      ];
    }

    return [true, undefined];
  };

  protected latestForeignBlock = async (): Promise<IBlockChainData> =>
    BlockChainData.findOne({ chainId: this.chainId }).sort({ blockId: -1 });

  protected blocksForReplication = async (chainStatus: ForeignChainStatus): Promise<IBlock[]> => {
    const dataTimestamp = this.timestampToDate(chainStatus.lastDataTimestamp + chainStatus.timePadding);

    const candidates = await Block.find({
      status: BlockStatus.Finalized,
      dataTimestamp: { $gt: dataTimestamp },
    })
      .sort({ blockId: -1 })
      .limit(10) // arbitrary value
      .exec();

    if (candidates.length == 0) {
      return [];
    }

    this.logger.info(`[${this.chainId}] ${candidates.length} candidates for ${dataTimestamp.toISOString()}`);

    const datas = await BlockChainData.find({ blockId: { $in: candidates.map((c) => c.blockId) } })
      .sort({ blockId: -1 })
      .exec();

    let foundBlockId: number;
    const cacheBlockNumber: Record<string, number> = {};

    for (const blockChainData of datas) {
      const { chainId, blockId } = blockChainData;
      // we need to wait for confirmations before we replicate block
      const { confirmations } = (this.settings.blockchain.multiChains as Record<string, BlockchainSettings>)[chainId];

      if (!cacheBlockNumber[chainId]) {
        cacheBlockNumber[chainId] = await this.blockchainRepository.get(chainId).getBlockNumber();
      }

      const blockNumber = cacheBlockNumber[chainId];
      const safeAnchor = blockNumber - confirmations;

      if (blockChainData.anchor <= safeAnchor) {
        this.logger.info(`[${this.chainId}] found block ${blockId} from ${chainId} with safe anchor ${safeAnchor}`);
        foundBlockId = blockId;
        break;
      }
    }

    return candidates.filter((block) => block.blockId == foundBlockId);
  };

  protected verifyBlocksForReplication = (blocks: IBlock[], chainStatus: ForeignChainStatus): boolean => {
    if (!blocks.length) {
      this.logger.info(`[${this.chainId}] nothing to replicate yet`);
      return false;
    }

    const [block] = blocks;

    if (block.blockId <= chainStatus.lastId) {
      this.logger.warn(`[${this.chainId}] block ${block.blockId} already replicated`);
      return false;
    }

    if (this.timestampToDate(chainStatus.lastDataTimestamp + chainStatus.timePadding) > block.dataTimestamp) {
      this.logger.info(`[${this.chainId}] block ${block.blockId} will be skipped because of padding`);
      return false;
    }

    return true;
  };

  protected timestampToDate = (timestamp: number): Date => new Date(timestamp * 1000);

  protected replicateBlock = async (
    dataTimestamp: Date,
    root: string,
    keys: string[],
    values: FeedValue[],
    blockId: number,
    chainStatus: ForeignChainStatus,
    transactionRequest: TransactionRequest = {}
  ): Promise<TransactionReceipt> => {
    const fn = (tr: TransactionRequest) =>
      this.foreignChainContract.submit(
        TimeService.msToSec(dataTimestamp.getTime()),
        root,
        keys.map(LeafKeyCoder.encode),
        values.map((v, i) => LeafValueCoder.encode(v, keys[i])),
        blockId,
        tr
      );

    const { minGasPrice, maxGasPrice } = this.blockchain.settings.transactions;

    const timeoutSec = chainStatus.timePadding * 1.5;
    const transaction = (tr: TransactionRequest) => this.txSender.apply(fn, minGasPrice, maxGasPrice, timeoutSec, tr);

    try {
      try {
        return await transaction(transactionRequest);
      } catch (e) {
        if (!ForeignBlockReplicator.isNonceError(e)) {
          this.noticeError(`[${this.chainId}] tx error ${JSON.stringify(transactionRequest)}`);
          throw e;
        }

        const lastNonce = await this.blockchain.getLastNonce();
        this.logger.warn(`[${this.chainId}] Submit tx with nonce ${lastNonce} failed. Retrying with ${lastNonce + 1}`);
        return await transaction({ ...transactionRequest, nonce: lastNonce + 1 });
      }
    } catch (e) {
      this.noticeError(e);
    }

    return null;
  };

  protected static isNonceError(e: Error): boolean {
    return e.message.includes('nonce has already been used');
  }

  private noticeError = (err: string): void => {
    this.logger.error(err);
  };
}
