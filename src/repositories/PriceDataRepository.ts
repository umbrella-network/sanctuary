import { inject, injectable } from 'inversify';
import { ethers } from 'ethers';
import { FilterQuery } from 'mongoose';
import { Logger } from 'winston';

import { ChainsIds } from '../types/ChainsIds';
import { FeedsPriceData } from '../types/UpdateInput';
import PriceData, { IPriceData, IPriceDataRaw } from '../models/PriceData';

@injectable()
export class PriceDataRepository {
  @inject('Logger') private logger!: Logger;

  async deleteMany(txHash: string): Promise<void> {
    await PriceData.deleteMany({ tx: txHash });
  }

  async lastPrices(chainId: ChainsIds | undefined, key: string, lastDays: number): Promise<IPriceDataRaw[]> {
    const from = new Date(Date.now() - lastDays * 24 * 60 * 60 * 1000);
    const filter: FilterQuery<IPriceData> = { key, timestamp: { $gte: Math.trunc(from.getTime() / 1000) } };

    if (chainId) {
      filter['chainId'] = chainId;
    }

    this.logger.info(`[PriceDataRepository.priceHistory][${chainId}] ${JSON.stringify(filter)}`);

    const records = await PriceData.find(filter).sort({ timestamp: -1 }).exec();

    return records.map((r) => {
      return {
        timestamp: r.timestamp,
        data: r.data,
        key: r.key,
        tx: r.tx,
        chainId: r.chainId,
        heartbeat: r.heartbeat,
        value: BigInt(r.value),
      };
    });
  }

  async save(chainId: ChainsIds, txHash: string, key: string, data: FeedsPriceData): Promise<boolean> {
    await PriceData.findOneAndUpdate(
      {
        _id: ethers.utils.id(`${chainId}::${txHash}::${key}`),
      },
      {
        tx: txHash,
        chainId,
        key,
        value: data.price.toString(),
        heartbeat: data.heartbeat,
        timestamp: data.timestamp,
        data: data.data,
      },
      {
        new: true,
        upsert: true,
      }
    );

    return true;
  }
}
