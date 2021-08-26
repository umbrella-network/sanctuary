import {inject} from 'inversify';
import Block, {IBlock} from '../../models/Block';
import ForeignBlock, {IForeignBlock} from '../../models/ForeignBlock';
import {ForeignChainStatus} from '../../types/ForeignChainStatus';
import {IForeignBlockReplicator} from './IForeignBlockReplicator';
import {ForeignChainContract} from '../../contracts/ForeignChainContract';
import {Logger} from 'winston';
import {BlockStatus} from '../../types/blocks';
import {FeedValue} from '@umb-network/toolbox/dist/types/Feed';
import {TxSender} from '../TxSender';
import {LeafKeyCoder, LeafValueCoder} from '@umb-network/toolbox';
import Settings from '../../types/Settings';
import Blockchain from '../../lib/Blockchain';
import {TransactionRequest} from '@ethersproject/abstract-provider/src.ts/index';
import newrelic from 'newrelic';
import {FailedTransactionEvent} from '../../constants/ReportedMetricsEvents';

export abstract class ForeignBlockReplicator implements IForeignBlockReplicator {
  @inject('Logger') protected logger!: Logger;
  @inject(ForeignChainContract) foreignChainContract: ForeignChainContract;

  txSender!: TxSender
  settings!: Settings;
  blockchain!: Blockchain;

  constructor(@inject('Settings') settings: Settings, @inject(Blockchain) blockchain: Blockchain) {
    this.settings = settings;
    this.blockchain = blockchain;
    this.txSender = new TxSender(this.blockchain.wallet, this.logger, this.settings.blockchain.transactions.waitForBlockTime);
  }

  getStatus = async (): Promise<ForeignChainStatus> => this.foreignChainContract.resolveStatus<ForeignChainStatus>();

  resolveSynchronizableBlocks = async (status: ForeignChainStatus): Promise<IBlock[]> => {
    if (!await this.canMint(status, Math.floor(Date.now() / 1000))) {
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

  synchronize = async (blocks: IBlock[], status: ForeignChainStatus): Promise<IBlock[]> => {
    // atm we assume we doing one block at a time
    const [block] = blocks;

    try {
      // TODO read last FCDs directly from chain
      const receipt = await this.replicateBlock(block.dataTimestamp, block.root, [], [], block.blockId, status);

      if (!receipt) {
        return [];
      }

      if (receipt.status === 1) {
        return blocks;
      }

      newrelic.recordCustomEvent(FailedTransactionEvent, {
        transactionHash: receipt.transactionHash,
      });
    } catch (_) {
      // errors are logged in replicateBlock()
    }

    return [];
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

    const {minGasPrice, maxGasPrice} = this.settings.blockchain.transactions;
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
}
