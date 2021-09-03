// TODO move this class to SDK and reuse in Pegasus and Sanctuary
import {Wallet} from 'ethers';
import {GasEstimator} from './GasEstimator';
import {TransactionResponse, TransactionReceipt} from '@ethersproject/providers';
import {GasPriceMetrics} from '../types/GasPriceMetrics';
import {TransactionRequest} from '@ethersproject/abstract-provider/src.ts/index';

interface ILogger {
  info(msg: string, meta?: Record<string, any>): void;
  warn(msg: string, meta?: Record<string, any>): void;
}

export class TxSender {
  readonly logger!: ILogger
  readonly wallet!: Wallet
  readonly waitForBlockTime!: number

  constructor(wallet: Wallet, logger: ILogger, waitForBlockTime = 500) {
    this.wallet = wallet;
    this.logger = logger;
    this.waitForBlockTime = waitForBlockTime;
  }

  // @throws when tx is not successful on time
  apply = async (
    fn: (tr: TransactionRequest) => Promise<TransactionResponse>,
    minGasPrice: number,
    maxGasPrice: number,
    timePadding: number,
    transactionRequest: TransactionRequest = {}
  ): Promise<TransactionReceipt> => {
    const gasMetrics = await GasEstimator.apply(this.wallet.provider, minGasPrice, maxGasPrice);

    this.logger.info(`Submitting tx, gas metrics: ${GasEstimator.printable(gasMetrics)}`);

    const {tx, receipt, timeoutMs} = await this.executeTx(fn, {gasPrice: gasMetrics.estimation, ...transactionRequest}, timePadding * 1000);

    if (!receipt) {
      this.logger.warn(`canceling tx ${tx.hash}`);
      const newGasMetrics = await GasEstimator.apply(this.wallet.provider, minGasPrice, maxGasPrice);

      await this.cancelPendingTransaction(gasMetrics.estimation, timePadding, newGasMetrics).catch(this.logger.warn);

      throw new Error(`mint TX timeout: ${timeoutMs}ms`);
    }

    return receipt;
  }

  private cancelPendingTransaction = async (prevGasPrice: number, timePadding: number, gasMetrics: GasPriceMetrics): Promise<boolean> => {
    const txData = <TransactionRequest>{
      from: this.wallet.address,
      to: this.wallet.address,
      value: 0n,
      nonce: await this.wallet.getTransactionCount('latest'),
      gasLimit: 21000,
      gasPrice: Math.max(gasMetrics.estimation, prevGasPrice) * 2,
    };

    this.logger.warn('Sending canceling tx', {nonce: txData.nonce, gasPrice: txData.gasPrice});

    const fn = (tr: TransactionRequest) => this.wallet.sendTransaction(tr);

    const {tx, receipt} = await this.executeTx(fn, txData,timePadding * 1000);

    if (!receipt || receipt.status !== 1) {
      this.logger.warn(`Canceling tx ${tx.hash}: filed or still pending`);
      return false;
    }

    return receipt.status === 1;
  }

  private waitUntilNextBlock = async (currentBlockNumber: number): Promise<number> => {
    // it would be nice to subscribe for blockNumber, but we forcing http for RPC
    // this is not pretty solution, but we using proxy, so infura calls should not increase
    let newBlockNumber = await this.wallet.provider.getBlockNumber();

    while (currentBlockNumber === newBlockNumber) {
      this.logger.info(`waitUntilNextBlock: current ${currentBlockNumber}, new ${newBlockNumber}.`);
      await TxSender.sleep(this.waitForBlockTime);
      newBlockNumber = await this.wallet.provider.getBlockNumber();
    }

    return newBlockNumber;
  }

  private executeTx = async (
    fn: (tr: TransactionRequest) => Promise<TransactionResponse>,
    transactionRequest: TransactionRequest,
    timeoutMs: number,
  ): Promise<{tx: TransactionResponse; receipt: TransactionReceipt | undefined; timeoutMs: number}> => {
    const [currentBlockNumber, tx] = await Promise.all([this.wallet.provider.getBlockNumber(), fn(transactionRequest)]);

    // there is no point of doing any action on tx if block is not minted
    const newBlockNumber = await this.waitUntilNextBlock(currentBlockNumber);

    this.logger.info(`New block detected ${newBlockNumber}, waiting for tx to be minted.`);

    return {tx, receipt: await Promise.race([tx.wait(), TxSender.txTimeout(timeoutMs)]), timeoutMs};
  }

  private static sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

  private static async txTimeout(timeout: number): Promise<undefined> {
    return new Promise<undefined>((resolve) =>
      setTimeout(async () => {
        resolve(undefined);
      }, timeout),
    );
  }
}
