import { inject, injectable, postConstruct } from 'inversify';
import { Request, Response, Router } from 'express';
import { ethers } from 'ethers';
import { Logger } from 'winston';

import { UpdateTxRepository } from '../repositories/UpdateTxRepository';
import { ChainsIds } from '../types/ChainsIds';
import { IUpdateTx } from '../models/UpdateTx';
import { PriceDataRepository } from '../repositories/PriceDataRepository';

type UpdateTxData = {
  failed: number;
  successfulUpdates: number;
  signatures: number;
  gasSuccess: bigint;
  gasFail: bigint;
};

@injectable()
export class OnChainReportsController {
  @inject('Logger') private logger: Logger;
  @inject(UpdateTxRepository) private updateTxRepository!: UpdateTxRepository;
  @inject(PriceDataRepository) private priceDataRepository!: PriceDataRepository;

  router: Router;

  @postConstruct()
  setup(): void {
    this.router = Router()
      .get('/monthly-expenses/:chainId/:year/:month', this.monthlyExpenses)
      .get('/price-history/:key', this.priceHistory)
      .get('/price-history/:chainId/:key', this.priceHistory);
  }

  priceHistory = async (request: Request, response: Response): Promise<void> => {
    const chainId = request.params.chainId as ChainsIds;
    const key = request.params.key;

    try {
      const prices = await this.priceDataRepository.lastPrices(chainId, key, 7);
      this.logger.info(`[priceHistory][${chainId}] got ${prices.length} records`);

      response
        // .type('application/text')
        .send(prices);
    } catch (e) {
      this.logger.error(e);
      response.status(500).send(e.message);
    }
  };

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

      response
        // .type('application/text')
        .send(this.processMonthlyExpenses(txs));
    } catch (e) {
      this.logger.error(e);
      response.status(500).send(e.message);
    }
  };

  /*
[
  'wallet: who submit',
  'failed tx',
  'submits for blocks: range of blocks for which query was done',
  'signatures: how many signatures validator did (excluding cases when he is leader)',
  'wei: gas spend in wei',
  'fail wei: gas spend for failed tx',
  'validator: address of signer (this address is registered in bank)'
]

if validator did not submit any tx, it will not be included in report, even if he might sign

*/
  private processMonthlyExpenses = (txs: IUpdateTx[]): string => {
    const results: Record<string, UpdateTxData> = {};
    let blockMin = Number.MAX_SAFE_INTEGER;
    let blockMax = 0;

    txs.forEach((tx) => {
      blockMin = Math.min(blockMin, tx.blockNumber);
      blockMax = Math.max(blockMax, tx.blockNumber);
      this.processTx(tx, results);
    });

    const records = Object.keys(results).map((sender) => {
      const { failed, gasFail, gasSuccess, successfulUpdates, signatures } = results[sender];
      const totalWei = ethers.utils.formatEther(gasFail + gasSuccess);
      return [sender, failed, successfulUpdates, signatures, gasFail, gasSuccess, totalWei].join(';');
    });

    const labels = [
      'wallet',
      'failed tx',
      `submits for blocks ${blockMin} - ${blockMax}`,
      'signatures',
      'failed gas',
      'success gas',
      'total gas',
    ];

    return `${labels.join(';')}\n${records.join('<br/>\n')}`;
  };

  private processTx = (tx: IUpdateTx, results: Record<string, UpdateTxData>): void => {
    const sender = tx.sender.toLowerCase();

    if (!results[sender]) {
      this.resetRecord(results, sender);
    }

    if (tx.success) {
      results[sender].successfulUpdates++;
      results[sender].gasSuccess += BigInt(tx.fee);
    } else {
      results[sender].failed++;
      results[sender].gasFail += BigInt(tx.fee);
    }

    tx.signers.forEach((s) => {
      if (!results[s]) this.resetRecord(results, s);
      results[s].signatures++;
    });
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
