// TODO move this class to SDK and reuse in Pegasus and Sanctuary
import { Wallet } from 'ethers';
import { TransactionResponse, TransactionReceipt } from '@ethersproject/providers';
import { TransactionRequest } from '@ethersproject/abstract-provider/src.ts';
import { GasEstimator, GasEstimation } from './GasEstimator';

interface ILogger {
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
}

interface TxSenderProps {
  wallet: Wallet;
  logger: ILogger;
  chainId: string;
  waitForBlockTime?: number;
}

export class TxSender {
  readonly logger!: ILogger;
  readonly wallet!: Wallet;
  readonly waitForBlockTime!: number;
  readonly chainId!: string;

  constructor(props: TxSenderProps) {
    this.wallet = props.wallet;
    this.logger = props.logger;
    this.waitForBlockTime = props.waitForBlockTime || 500;
    this.chainId = props.chainId;
  }

  // @throws when tx is not successful on time
  apply = async (
    fn: (tr: TransactionRequest) => Promise<TransactionResponse>,
    minGasPrice: number,
    maxGasPrice: number,
    timeoutSec: number,
    transactionRequest: TransactionRequest = {}
  ): Promise<TransactionReceipt> => {
    const gasEstimation = await GasEstimator.apply(this.wallet.provider, minGasPrice, maxGasPrice);
    const { gasPrice, maxPriorityFeePerGas, maxFeePerGas, isTxType2 } = gasEstimation;

    const gas = {
      type: isTxType2 ? 2 : 0,
      gasPrice: isTxType2 ? undefined : gasPrice,
      maxPriorityFeePerGas: isTxType2 ? maxPriorityFeePerGas : undefined,
      maxFeePerGas: isTxType2 ? maxFeePerGas : undefined,
    };

    this.logger.info(`[${this.chainId}] submitting tx, gas metrics: ${GasEstimator.printable(gasEstimation)}`);

    const { tx, receipt, timeoutMs } = await this.executeTx(fn, { ...gas, ...transactionRequest }, timeoutSec * 1000);

    if (!receipt) {
      this.logger.warn(`[${this.chainId}] canceling tx ${tx.hash}`);
      const newGasMetrics = await GasEstimator.apply(this.wallet.provider, minGasPrice, maxGasPrice);

      await this.cancelPendingTransaction(gasEstimation.gasPrice, timeoutSec, newGasMetrics).catch(this.logger.warn);

      throw new Error(`[${this.chainId}] mint TX timeout: ${timeoutMs}ms`);
    }

    return receipt;
  };

  private cancelPendingTransaction = async (
    prevGasPrice: number,
    timePadding: number,
    gasEstimation: GasEstimation
  ): Promise<boolean> => {
    const { isTxType2 } = gasEstimation;
    const higherGasPrice = Math.max(gasEstimation.gasPrice, prevGasPrice) * 2;

    const txData = <TransactionRequest>{
      from: this.wallet.address,
      to: this.wallet.address,
      value: 0n,
      nonce: await this.wallet.getTransactionCount('latest'),
      gasLimit: 21000,
      gasPrice: isTxType2 ? undefined : higherGasPrice,
      maxPriorityFeePerGas: isTxType2 ? gasEstimation.maxPriorityFeePerGas * 1.5 : undefined,
      maxFeePerGas: isTxType2 ? higherGasPrice : undefined,
    };

    this.logger.warn(`[${this.chainId}] sending canceling tx, nonce: ${txData.nonce}, gasPrice: ${higherGasPrice}`);

    const fn = (tr: TransactionRequest) => this.wallet.sendTransaction(tr);

    let tx, receipt;

    try {
      ({ tx, receipt } = await this.executeTx(fn, txData, timePadding * 1000));
    } catch (e) {
      if (e.message.includes('replacement fee too low')) {
        const evenHigherGasPrice = higherGasPrice * 2;

        const newTxData = <TransactionRequest>{
          ...txData,
          gasPrice: isTxType2 ? undefined : evenHigherGasPrice,
          maxFeePerGas: isTxType2 ? evenHigherGasPrice : undefined,
        };

        this.logger.warn(
          `[${this.chainId}] re-sending canceling tx, nonce: ${txData.nonce}, gasPrice: ${evenHigherGasPrice}`
        );

        ({ tx, receipt } = await this.executeTx(fn, newTxData, timePadding * 1000));
      } else {
        throw e;
      }
    }

    if (!receipt || receipt.status !== 1) {
      this.logger.warn(`[${this.chainId}] canceling tx ${tx.hash}: filed or still pending`);
      return false;
    }

    return receipt.status === 1;
  };

  private waitUntilNextBlock = async (currentBlockNumber: number): Promise<number> => {
    // it would be nice to subscribe for blockNumber, but we forcing http for RPC
    // this is not pretty solution, but we using proxy, so infura calls should not increase
    let newBlockNumber = await this.wallet.provider.getBlockNumber();

    while (currentBlockNumber === newBlockNumber) {
      this.logger.info(`[${this.chainId}] waitUntilNextBlock: current ${currentBlockNumber}, new ${newBlockNumber}.`);
      await TxSender.sleep(this.waitForBlockTime);
      newBlockNumber = await this.wallet.provider.getBlockNumber();
    }

    return newBlockNumber;
  };

  private executeTx = async (
    fn: (tr: TransactionRequest) => Promise<TransactionResponse>,
    transactionRequest: TransactionRequest,
    timeoutMs: number
  ): Promise<{ tx: TransactionResponse; receipt: TransactionReceipt | undefined; timeoutMs: number }> => {
    const [currentBlockNumber, tx] = await Promise.all([this.wallet.provider.getBlockNumber(), fn(transactionRequest)]);

    // there is no point of doing any action on tx if block is not minted
    const newBlockNumber = await this.waitUntilNextBlock(currentBlockNumber);

    this.logger.info(`[${this.chainId}] new block detected ${newBlockNumber}, waiting for tx to be minted.`);

    return { tx, receipt: await Promise.race([tx.wait(), TxSender.txTimeout(timeoutMs)]), timeoutMs };
  };

  private static sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

  private static async txTimeout(timeout: number): Promise<undefined> {
    return new Promise<undefined>((resolve) =>
      setTimeout(async () => {
        resolve(undefined);
      }, timeout)
    );
  }
}
