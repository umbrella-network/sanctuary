import { inject, injectable } from 'inversify';
import { TransactionReceipt, TransactionResponse } from '@ethersproject/providers';
import InputDataDecoder from 'ethereum-input-data-decoder';
import { Logger } from 'winston';

import { ChainsIds } from '../types/ChainsIds';
import UpdateTx, { IUpdateTx } from '../models/UpdateTx';
import { abi } from '../contracts/UmbrellaFeeds.json';
import { FeedsPriceData, UpdateData, UpdateInput } from '../types/UpdateInput';
import { GasCalculator } from '../services/on-chain-stats/GasCalculator';
import { SignersRecoveryEvm } from '../services/on-chain-stats/SignerRecovery';
import { PriceDataRepository } from './PriceDataRepository';
import { FeedKeyRepository } from './FeedKeyRepository';

@injectable()
export class UpdateTxRepository {
  @inject('Logger') private logger!: Logger;
  @inject(GasCalculator) private gasCalculator: GasCalculator;
  @inject(PriceDataRepository) private priceDataRepository: PriceDataRepository;
  @inject(FeedKeyRepository) private feedKeyRepository: FeedKeyRepository;

  async saveUpdates(
    chainId: ChainsIds,
    networkId: number,
    tx: TransactionResponse,
    receipt: TransactionReceipt
  ): Promise<boolean> {
    const decoder = new InputDataDecoder(abi);
    const decodeData = decoder.decodeData(tx.data);

    if (decodeData.method != 'update') {
      this.logger.info(`[UpdateTxRepository] '${decodeData.method}' method is ignored`);
      return true;
    }

    const updateData = this.toUpdateData((decodeData.inputs as unknown) as UpdateInput);
    const existingKeys = await this.feedKeyRepository.getAllByHash();

    const prettyKeys = updateData.keys.map((hash) => {
      const name = existingKeys[hash];
      if (!name) throw new Error(`[UpdateTxRepository] can not find name for hash ${hash}`);
      return name;
    });

    await UpdateTx.findOneAndUpdate(
      {
        _id: tx.hash,
      },
      {
        txTimestamp: new Date(tx.timestamp * 1000),
        chainId,
        feedsAddress: tx.to,
        blockNumber: tx.blockNumber,
        success: !!receipt.status,
        sender: tx.from,
        signers: SignersRecoveryEvm.apply(networkId, tx.to, updateData),
        fee: this.gasCalculator.apply(chainId, receipt).toString(10),
        kees: prettyKeys,
      },
      {
        new: true,
        upsert: true,
      }
    );

    try {
      await Promise.all(
        prettyKeys.map((key, i) => this.priceDataRepository.save(chainId, tx.hash, key, updateData.priceDatas[i]))
      );
    } catch (e) {
      this.logger.error(`[UpdateTxRepository] ${e.message}`);
      await UpdateTx.deleteOne({ _id: tx.hash });
      await this.priceDataRepository.deleteMany(tx.hash);
      return false;
    }

    this.logger.info(`[UpdateTxRepository] saved update data for tx ${tx.hash}`);
    return true;
  }

  async getBlocks(chainId: ChainsIds, from: number, to: number): Promise<number[]> {
    const records = await UpdateTx.find({ chainId, blockNumber: { $gte: from, $lte: to } }).exec();
    return records.map((r) => r.blockNumber);
  }

  async findMonthlyTx(chainId: ChainsIds, year: number, month: number): Promise<IUpdateTx[]> {
    const from = new Date(`${year}-${month}-01`);
    const nextY = year + (month == 12 ? 1 : 0);
    const nextM = month == 12 ? 1 : month + 1;
    const to = new Date(`${nextY}-${nextM.toString(10).padStart(2, '0')}-01`);

    return UpdateTx.find({ chainId, txTimestamp: { $gte: from, $lt: to } }).exec();
  }

  private toUpdateData(data: UpdateInput): UpdateData {
    return {
      keys: data[0],
      priceDatas: data[1].map((d) => {
        return <FeedsPriceData>{
          data: d[0].toString(16),
          heartbeat: d[1],
          timestamp: d[2],
          price: BigInt(d[3].toString()),
        };
      }),
      signatures: data[2].map(([v, r, s]) => {
        return { v, r, s };
      }),
    };
  }
}
