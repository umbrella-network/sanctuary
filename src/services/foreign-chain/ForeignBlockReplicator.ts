import { inject, injectable, postConstruct } from 'inversify';
import {Logger} from 'winston';
import newrelic from 'newrelic';

import {FeedValue} from '@umb-network/toolbox/dist/types/Feed';
import {LeafKeyCoder, LeafValueCoder} from '@umb-network/toolbox';
import {TransactionRequest} from '@ethersproject/abstract-provider/src.ts/index';

import Block, {IBlock} from '../../models/Block';
import ForeignBlock, {IForeignBlock} from '../../models/ForeignBlock';
import FCD from '../../models/FCD';

import {ForeignChainStatus} from '../../types/ForeignChainStatus';
import {BlockStatus} from '../../types/blocks';

import {ForeignChainContract} from '../../contracts/ForeignChainContract';
import ChainContract from '../../contracts/ChainContract';

import {IForeignBlockReplicator} from './IForeignBlockReplicator';
import {TxSender} from '../TxSender';
import Settings from '../../types/Settings';
import Blockchain from '../../lib/Blockchain';
import {FailedTransactionEvent} from '../../constants/ReportedMetricsEvents';
import {ChainFCDsData} from '../../models/ChainBlockData';

export type ReplicationStatus = {
  blocks?: IBlock[];
  anchors?: number[];
  errors?: string[];
}

@injectable()
export abstract class ForeignBlockReplicator implements IForeignBlockReplicator {
  @inject('Logger') protected logger!: Logger;
  @inject(ForeignChainContract) foreignChainContract: ForeignChainContract;
  @inject(ChainContract) chainContract: ChainContract;
  @inject('Settings') settings: Settings;
  @inject(Blockchain) blockchain: Blockchain;

  readonly chainId!: string;
  private txSender!: TxSender

  @postConstruct()
  private setup() {
    this.txSender = new TxSender(
      this.blockchain.wallets[this.chainId],
      this.logger,
      this.blockchain.getBlockchainSettings(this.chainId).transactions.waitForBlockTime
    );
  }

  // getStatus = async (): Promise<ForeignChainStatus> => this.foreignChainContract.resolveStatus<ForeignChainStatus>();
  async getStatus(): Promise<ForeignChainStatus> {
    return this.foreignChainContract.resolveStatus<ForeignChainStatus>();
  }

  resolvePendingBlocks = async (status: ForeignChainStatus, currentDate: Date): Promise<IBlock[]> => {
    if (!await this.canMint(status, currentDate.getTime())) {
      return [];
    }

    const blocks = await this.blocksForReplication(status);

    if (!this.verifyBlocksForReplication(blocks, status)) {
      return [];
    }

    const lastForeignBlock = await this.latestForeignBlock();

    if (lastForeignBlock.blockId !== status.lastBlockId) {
      // in theory this can happen if we submit block but mongo will not be able to save it
      this.logger.error(`Huston we have a problem: block ${status.lastBlockId} is not present in mongo`);
    }

    return blocks;
  }

  replicate = async (blocks: IBlock[], status: ForeignChainStatus): Promise<ReplicationStatus> => {
    // atm we assume we doing one block at a time
    const [block] = blocks;

    try {
      const {keys, values} = await this.fetchFCDs(block);
      const receipt = await this.replicateBlock(block.dataTimestamp, block.root, keys, values, block.blockId, status);

      // this is when the replication failed
      if (!receipt) return { errors: ['Something happened :('] };

      // YAY
      if (receipt.status === 1) {
        return {
          blocks: [block],
          anchors: [receipt.blockNumber]
        };
      }

      newrelic.recordCustomEvent(FailedTransactionEvent, {
        transactionHash: receipt.transactionHash,
      });
    } catch (_) {
      // errors are logged in replicateBlock()
    }

    return { errors: ["Transaction Failed"] };
  }

  private canMint = async (chainStatus: ForeignChainStatus, dataTimestamp: number): Promise<boolean> => {
    const [ready, error] = this.chainReadyForNewBlock(chainStatus, dataTimestamp);
    error && this.logger.info(error);
    return ready;
  }

  private chainReadyForNewBlock = (
    chainStatus: ForeignChainStatus,
    newDataTimestamp: number,
  ): [ready: boolean, error: string | undefined] => {
    if (chainStatus.lastDataTimestamp + chainStatus.timePadding > newDataTimestamp) {
      return [false, `skipping ${chainStatus.nextBlockId.toString()}: waiting for next round`];
    }

    if (newDataTimestamp <= chainStatus.lastDataTimestamp) {
      return [
        false,
        `skipping ${chainStatus.nextBlockId.toString()}, can NOT submit older data ${
          chainStatus.lastDataTimestamp
        } vs ${newDataTimestamp}`,
      ];
    }

    return [true, undefined];
  };

  private latestForeignBlock = async (): Promise<IForeignBlock> => ForeignBlock.findOne().sort({blockId: -1});

  private blocksForReplication = async (chainStatus: ForeignChainStatus): Promise<IBlock[]> => Block.find({
    status: BlockStatus.Finalized,
    dataTimestamp: {$gt: this.timestampToDate(chainStatus.lastDataTimestamp + chainStatus.timePadding)},
  }).sort({blockId: -1}).limit(1);

  private verifyBlocksForReplication = (blocks: IBlock[], chainStatus: ForeignChainStatus): boolean => {
    if (!blocks.length) {
      this.logger.info('nothing to replicate yet');
      return false;
    }

    const [block] = blocks;

    if (!(block.blockId > chainStatus.lastBlockId)) {
      this.logger.error(`block ${block.blockId} already replicated`);
      return false;
    }

    if (!(block.dataTimestamp > this.timestampToDate(chainStatus.lastDataTimestamp + chainStatus.timePadding))) {
      this.logger.info(`block ${block.blockId} will be skipped because of padding`);
      return false;
    }

    return true;
  }

  private timestampToDate = (timestamp: number): Date => new Date(timestamp * 1000)

  private replicateBlock = async (
    dataTimestamp: Date,
    root: string,
    keys: string[],
    values: FeedValue[],
    blockId: number,
    chainStatus: ForeignChainStatus,
    transactionRequest: TransactionRequest = {}
  ) => {
    const fn = (tr: TransactionRequest) =>
      this.foreignChainContract.submit(
        dataTimestamp.getTime(),
        root,
        keys.map(LeafKeyCoder.encode),
        values.map((v, i) => LeafValueCoder.encode(v, keys[i])),
        blockId,
        tr
      );

    const {minGasPrice, maxGasPrice} = this.blockchain.getBlockchainSettings(this.chainId).transactions;
    const transaction = (tr: TransactionRequest) => this.txSender.apply(fn, minGasPrice, maxGasPrice, chainStatus.timePadding, tr);

    try {
      try {
        return await transaction(transactionRequest);
      } catch (e) {
        if (!ForeignBlockReplicator.isNonceError(e)) {
          throw e;
        }

        const lastNonce = await this.blockchain.getLastNonce();
        this.logger.warn(`Submit tx with nonce ${lastNonce} failed. Retrying with ${lastNonce + 1}`);
        return await transaction({...transactionRequest, nonce: lastNonce + 1});
      }
    } catch (e) {
      this.logger.error(e);
    }

    return null;
  }

  private static isNonceError(e: Error): boolean {
    return e.message.includes('nonce has already been used');
  }

  private async fetchFCDs(block: IBlock): Promise<{ keys: string[], values: FeedValue[] }> {
    const keys: string[] = [];
    const values: FeedValue[] = [];

    const allKeys = (await FCD.find()).map(item => item._id);
    
    const [fcdsValues, fcdsTimestamps] = <ChainFCDsData>await this.chainContract.resolveFCDs(block.chainAddress, allKeys);

    fcdsTimestamps.forEach((timestamp, i) => {
      if (timestamp >= block.dataTimestamp.getTime()) {
        keys.push(allKeys[i]);
        values.push(fcdsValues[i]._hex);
      }
    });
    
    return {keys, values};
  }
}
