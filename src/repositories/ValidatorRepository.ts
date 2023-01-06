import { inject, injectable } from 'inversify';
import { Logger } from 'winston';
import { BigNumber } from 'ethers';

import Settings from '../types/Settings';
import CachedValidator from '../models/Validator';
import { Validator } from '../types/Validator';

@injectable()
export class ValidatorRepository {
  @inject('Logger') protected logger!: Logger;
  @inject('Settings') protected settings!: Settings;

  async list(): Promise<Validator[]> {
    const list = await CachedValidator.find().exec();

    return list.map(
      (data): Validator => {
        return {
          id: data.address,
          power: BigNumber.from(data.power),
          location: data.location,
        };
      }
    );
  }

  async cache(validators: Validator[]): Promise<void> {
    const ids = validators.map(({ id }) => `validator::${id.toLowerCase()}`);
    await CachedValidator.deleteMany({ _id: { $nin: ids } });

    await Promise.all(
      validators.map((data) => {
        const id = `validator::${data.id.toLowerCase()}`;

        return CachedValidator.findOneAndUpdate(
          { _id: id },
          {
            _id: id,
            address: data.id,
            location: data.location,
            power: data.power.toString(),
            updatedAt: new Date(),
          }
        ).exec();
      })
    );
  }
}
