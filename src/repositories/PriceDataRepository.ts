import { injectable } from 'inversify';

import { ChainsIds } from '../types/ChainsIds';
import { FeedsPriceData } from '../types/UpdateInput';
import PriceData, { IPriceData } from '../models/PriceData';
import { FilterQuery } from 'mongoose';

@injectable()
export class PriceDataRepository {
  async deleteMany(txHash: string): Promise<void> {
    await PriceData.deleteMany({ tx: txHash });
  }

  async lastPrices(chainId: ChainsIds | undefined, key: string, days: number): Promise<IPriceData[]> {
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const filter: FilterQuery<IPriceData> = { key, timestamp: { $gte: from.getTime() / 1000 } };
    if (chainId) filter['chainId'] = chainId;
    return PriceData.find(filter).sort({ timestamp: 1 }).exec();
  }

  async save(chainId: ChainsIds, txHash: string, key: string, data: FeedsPriceData): Promise<boolean> {
    await PriceData.findOneAndUpdate(
      {
        _id: `${chainId}::${key}::${data.timestamp}`,
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
