import { injectable } from 'inversify';
import Mapping from '../models/Mapping';

@injectable()
export class MappingRepository {
  async get(_id: string): Promise<string | undefined> {
    const map = await Mapping.findOne({ _id }).exec();
    return map?.value;
  }

  async getMany(keys: string[]): Promise<Record<string, string>> {
    const map = await Mapping.find({ _id: { $in: keys } }).exec();

    return map.reduce((acc, data) => {
      acc[data._id] = data.value;
      return acc;
    }, {} as Record<string, string>);
  }

  async set(_id: string, value: string): Promise<void> {
    await Mapping.findOneAndUpdate({ _id }, { _id, value }, { upsert: true, new: true }).exec();
  }

  async setMany(data: { _id: string; value: string }[]): Promise<void> {
    await Promise.all(data.map(({ _id, value }) => this.set(_id, value)));
  }
}
