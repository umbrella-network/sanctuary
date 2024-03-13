import { inject, injectable, postConstruct } from 'inversify';
import { Request, Response, Router } from 'express';
import { ethers } from 'ethers';
import { Logger } from 'winston';

import { UpdateTxRepository } from '../repositories/UpdateTxRepository';
import { ChainsIds } from '../types/ChainsIds';
import { IUpdateTx } from '../models/UpdateTx';
import { PriceDataRepository } from '../repositories/PriceDataRepository';
import { ValidatorWalletsRepository } from '../repositories/ValidatorWalletsRepository';
import { IPriceDataRaw } from '../models/PriceData';

type UpdateTxData = {
  failed: number;
  successfulUpdates: number;
  signatures: number;
  gasSuccess: bigint;
  gasFail: bigint;
};

interface TxMapInterface {
  txTimestamp: number;
  fee: bigint;
}

interface ExpensesReportLabels {
  sender: string;
  failedTx: string;
  submits: string;
  signatures: string;
  gasOnFailedTx: string;
  gasOnSuccessfulTx: string;
  totalGas: string;
  signingWallet: string;
}

interface ExpensesReportValues {
  sender: string;
  failedTx: number;
  submits: number;
  signatures: number;
  gasOnFailedTx: bigint;
  gasOnSuccessfulTx: bigint;
  totalGas: string;
  signingWallet: string;
}

interface PriceHistoryReportLabels {
  key: string;
  timestamp: string;
  txFinality: string;
  txHash: string;
  price: string;
  priceDiff: string;
  prevHeartbeat: string;
  heartbeatUsed: string;
  overshoot: string;
  roundsLeft: string;
  txCost: string;
  feedsInTx: string;
}

interface PriceHistoryReportValues {
  key: string;
  timestamp: Date;
  txFinality: number;
  txHash: string;
  price: number;
  priceDiff: number;
  prevHeartbeat: number;
  heartbeatUsed: number;
  overshoot: number;
  roundsLeft: number;
  txCost: bigint;
  feedsInTx: number;
}

type WalletsMap = Record<string, { deviation: string; signer: string }>;

@injectable()
export class OnChainReportsController {
  @inject('Logger') private logger: Logger;
  @inject(UpdateTxRepository) private updateTxRepository!: UpdateTxRepository;
  @inject(PriceDataRepository) private priceDataRepository!: PriceDataRepository;
  @inject(ValidatorWalletsRepository) private validatorWalletsRepository!: ValidatorWalletsRepository;

  router: Router;

  @postConstruct()
  setup(): void {
    this.router = Router()
      .get('/monthly-expenses/:chainId/:year/:month', this.monthlyExpenses)
      // .get('/price-history/:key', this.priceHistory)
      .get('/price-history/:chainId/:key', this.priceHistory)
      .get('/price-history/:chainId/:key/last/:days/days', this.priceHistory);
  }

  monthlyExpenses = async (request: Request, response: Response): Promise<void> => {
    const chainId = request.params.chainId as ChainsIds;

    if (!Object.values(ChainsIds).includes(chainId)) {
      const msg = `expect chainId to be one of ${Object.values(ChainsIds)}, got ${chainId}`;
      this.logger.error(msg);
      response.status(500).send(msg);
      return;
    }

    const year = parseInt(<string>request.params.year);

    if (year < 2024 || year > 2300) {
      const msg = `expect year to be between 2024 - 2300, got ${year}`;
      this.logger.error(msg);
      response.status(500).send(msg);
      return;
    }

    const month = parseInt(<string>request.params.month);

    if (month < 1 || month > 12) {
      const msg = `expect month to be between 1 - 12, got ${month}`;
      this.logger.error(msg);
      response.status(500).send(msg);
      return;
    }

    try {
      const txs = await this.updateTxRepository.findMonthlyTx(chainId, year, month);
      this.logger.info(`[monthlyExpenses][${chainId}] got ${txs.length} records`);
      const signerToSender = await this.validatorsMap(chainId);

      response
        // .type('application/text')
        .send(this.processMonthlyExpenses(txs, signerToSender));
    } catch (e) {
      this.logger.error(e);
      response.status(500).send(e.message);
    }
  };

  priceHistory = async (request: Request, response: Response): Promise<void> => {
    const chainId = request.params.chainId as ChainsIds;
    const key = request.params.key;
    let days = parseInt(request.params.days || '3');
    const daysLimit = 365;

    if (days > daysLimit) {
      this.logger.warn(`[priceHistory][${chainId}] days limit is ${daysLimit}`);
      days = daysLimit;
    }

    try {
      const prices = await this.priceDataRepository.lastPrices(chainId, key, days);
      this.logger.info(`[priceHistory][${chainId}] got ${prices.length} records`);
      const history = await this.printOnChainHistory(chainId, key, prices);

      response
        // .type('application/text')
        .send(history.join('<br/>\n'));
    } catch (e) {
      this.logger.error(e);
      response.status(500).send(e.message);
    }
  };

  private printOnChainHistory = async (
    chainId: ChainsIds,
    key: string,
    feedsHistory: IPriceDataRaw[]
  ): Promise<string[]> => {
    const results: string[] = [];
    const separator = ';';

    const historyReportLabels: PriceHistoryReportLabels = {
      key: 'key',
      timestamp: 'timestamp of the feed',
      txFinality: 'how long it took from start of consensus to mint tx',
      txHash: 'tx hash',
      price: 'price',
      priceDiff: 'price difference',
      prevHeartbeat: 'previous heartbeat',
      heartbeatUsed: '[%] of heartbeat used',
      overshoot: 'overshoot: if we not deliver in time, overshoot time is presented in negative [seconds]',
      roundsLeft: 'rounds left: how many rounds was left till the end of heartbeat',
      txCost: 'gas used for tx',
      feedsInTx: 'number of feeds updated in one tx',
    };

    results.push(Object.values(historyReportLabels).join(separator));

    let prev = {
      ...feedsHistory[feedsHistory.length > 0 ? 1 : 0],
    };

    const txMap = await this.getTxMap(chainId, feedsHistory);

    feedsHistory.forEach((p, i) => {
      const txData = txMap[p.tx];
      const price = BigInt(p.value);
      const prevPrice = BigInt(prev.value);
      const hDiffSec = p.timestamp - prev.timestamp;
      const hDiff = Math.round((hDiffSec * 10000) / prev.heartbeat) / 100;
      const hDiffRounds = hDiff <= 100 ? Math.floor((prev.heartbeat - hDiffSec) / 60) : -1;

      const data: PriceHistoryReportValues = {
        key,
        timestamp: new Date(p.timestamp * 1000),
        txFinality: txData.txTimestamp ? txData.txTimestamp - p.timestamp : -1,
        txHash: p.tx,
        price: Number(p.value) / 1e8,
        priceDiff: Number(((price - prevPrice) * 10000n) / prevPrice) / 100,
        prevHeartbeat: prev.heartbeat,
        heartbeatUsed: Math.round((hDiffSec * 10000) / prev.heartbeat) / 100,
        overshoot: hDiffRounds < 0 ? prev.heartbeat - hDiffSec : 0,
        roundsLeft: hDiffRounds < 0 ? -1 : hDiffRounds,
        txCost: txData.fee,
        feedsInTx: feedsHistory.filter((h) => h.tx == p.tx).length,
      };

      results.push(
        Object.values(<PriceHistoryReportLabels>{
          key: data.key,
          timestamp: data.timestamp.toISOString(),
          txFinality: data.txFinality.toString(),
          txHash: data.txHash,
          price: data.price.toString(),
          priceDiff: `${data.priceDiff}%`,
          prevHeartbeat: data.prevHeartbeat.toString(),
          heartbeatUsed: `${data.heartbeatUsed}%`,
          overshoot: data.overshoot.toString(),
          roundsLeft: `${data.roundsLeft < 0 ? '- !!! -' : data.roundsLeft}`,
          txCost: ethers.utils.formatEther(data.txCost),
          feedsInTx: data.feedsInTx.toString(),
        }).join(';')
      );

      prev = {
        ...(feedsHistory[i + 2] || feedsHistory[i + 1]),
      };
    });

    return results;
  };

  private getTxMap = async (
    chainId: ChainsIds,
    feedsHistory: IPriceDataRaw[]
  ): Promise<Record<string, TxMapInterface>> => {
    const txs = await this.updateTxRepository.find(
      chainId,
      feedsHistory.map((k) => k.tx),
      { txTimestamp: 1, fee: 1 }
    );

    const txMap: Record<string, TxMapInterface> = {};

    txs.forEach((tx) => {
      txMap[tx._id] = {
        txTimestamp: Math.trunc(tx.txTimestamp.getTime() / 1000),
        fee: BigInt(tx.fee),
      };
    });

    return txMap;
  };

  /*
if validator did not submit any tx, it will not be included in report, even if he might sign
*/
  private processMonthlyExpenses = (txs: IUpdateTx[], signerToSender: WalletsMap): string => {
    const results: Record<string, UpdateTxData> = {};
    let blockMin = Number.MAX_SAFE_INTEGER;
    let blockMax = 0;

    txs.forEach((tx) => {
      blockMin = Math.min(blockMin, tx.blockNumber);
      blockMax = Math.max(blockMax, tx.blockNumber);
      this.processTx(tx, results, signerToSender);
    });

    const records = Object.keys(results)
      .map((sender) => {
        const { failed, gasFail, gasSuccess, successfulUpdates, signatures } = results[sender];
        const totalWei = ethers.utils.formatEther(gasFail + gasSuccess);

        return <ExpensesReportValues>{
          sender,
          failedTx: failed,
          submits: successfulUpdates,
          signatures,
          gasOnFailedTx: gasFail,
          gasOnSuccessfulTx: gasSuccess,
          totalGas: totalWei,
          signingWallet: signerToSender[sender]?.signer || '',
        };
      })
      .sort((a, b) => b.signatures - a.signatures)
      .map((data) => {
        return Object.values(<ExpensesReportLabels>{
          sender: data.sender,
          failedTx: data.failedTx.toString(),
          submits: data.submits.toString(),
          signatures: data.signatures.toString(),
          gasOnFailedTx: data.gasOnFailedTx.toString(),
          gasOnSuccessfulTx: data.gasOnSuccessfulTx.toString(),
          totalGas: data.totalGas.toString(),
          signingWallet: data.signingWallet,
        }).join(';');
      });

    const expensesReportLabels: ExpensesReportLabels = {
      sender: 'wallet (sender)',
      failedTx: 'failed tx',
      submits: `submits for blocks ${blockMin} - ${blockMax}`,
      signatures: 'signatures (only successful tx)',
      gasOnFailedTx: 'failed gas',
      gasOnSuccessfulTx: 'success gas',
      totalGas: 'total gas',
      signingWallet: 'signing wallet',
    };

    const labels = Object.values(expensesReportLabels);
    const separator = '<br/>\n';
    return `${labels.join(';')}${separator}${records.join(separator)}`;
  };

  private processTx = (tx: IUpdateTx, results: Record<string, UpdateTxData>, signerToSender: WalletsMap): void => {
    const sender = tx.sender.toLowerCase();

    if (!results[sender]) {
      this.resetRecord(results, sender);
    }

    if (tx.success) {
      results[sender].successfulUpdates++;
      results[sender].gasSuccess += BigInt(tx.fee);

      tx.signers.forEach((s) => {
        const senderFromSig = signerToSender[s]?.deviation ? signerToSender[s].deviation : 'unknown';
        if (senderFromSig == sender) return;

        if (!results[senderFromSig]) this.resetRecord(results, senderFromSig);
        results[senderFromSig].signatures++;
      });
    } else {
      results[sender].failed++;
      results[sender].gasFail += BigInt(tx.fee);
    }
  };

  private validatorsMap = async (chainId: ChainsIds): Promise<WalletsMap> => {
    const validators = await this.validatorWalletsRepository.get(chainId);
    const list: WalletsMap = {};

    validators.forEach((v) => {
      list[v.signer] = { deviation: v.deviation, signer: v.signer };
      list[v.deviation] = { deviation: v.deviation, signer: v.signer };
    });

    return list;
  };

  private resetRecord = (results: Record<string, UpdateTxData>, key: string): void => {
    if (!results[key]) {
      results[key] = {
        failed: 0,
        gasFail: 0n,
        gasSuccess: 0n,
        successfulUpdates: 0,
        signatures: 0,
      };
    }
  };
}
