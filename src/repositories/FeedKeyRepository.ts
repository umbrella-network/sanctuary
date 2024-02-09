import { injectable } from 'inversify';
import { ethers } from 'ethers';

import FeedKey from '../models/FeedKey';

@injectable()
export class FeedKeyRepository {
  async getAllByKey(): Promise<Record<string, string>> {
    const map: Record<string, string> = {};
    const all = await FeedKey.find().exec();

    all.forEach((data) => {
      map[data.key] = data.id;
    });

    return map;
  }

  async getAllByHash(): Promise<Record<string, string>> {
    const map: Record<string, string> = {};
    const all = await FeedKey.find().exec();

    all.forEach((data) => {
      map[data.id] = data.key;
    });

    return map;
  }

  async save(key: string): Promise<void> {
    await FeedKey.findOneAndUpdate(
      {
        _id: ethers.utils.id(key),
      },
      {
        key,
      },
      {
        new: true,
        upsert: true,
      }
    );
  }
}
