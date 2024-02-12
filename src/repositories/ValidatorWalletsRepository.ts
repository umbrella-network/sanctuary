import { inject, injectable } from 'inversify';
import { Logger } from 'winston';

import Settings from '../types/Settings';
import ValidatorWallets, { IValidatorWallets } from '../models/ValidatorWallets';
import { ChainsIds } from '../types/ChainsIds';

@injectable()
export class ValidatorWalletsRepository {
  @inject('Logger') protected logger!: Logger;
  @inject('Settings') protected settings!: Settings;

  async get(chainId: ChainsIds): Promise<IValidatorWallets[]> {
    return ValidatorWallets.find({ chainId }).exec();
  }

  async save(chainId: ChainsIds, validators: IValidatorWallets[]): Promise<void> {
    await Promise.all(
      validators.map((data) => {
        const id = `validator::${chainId}::${data.signer.toLowerCase()}`;

        return ValidatorWallets.findOneAndUpdate(
          { _id: id },
          {
            _id: id,
            signer: data.signer.toLowerCase(),
            deviation: data.deviation.toLowerCase(),
            chainId,
          }
        ).exec();
      })
    );
  }
}
