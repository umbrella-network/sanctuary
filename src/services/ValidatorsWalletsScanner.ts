import { Logger } from 'winston';
import { inject, injectable } from 'inversify';
import axios from 'axios';
import { ChainsIds } from '../types/ChainsIds';
import Settings from '../types/Settings';
import { IValidator } from '../models/Validator';
import { StakingBankValidatorsRepository } from '../repositories/StakingBankValidatorsRepository';
import { IValidatorWallets } from '../models/ValidatorWallets';
import { ValidatorWalletsRepository } from '../repositories/ValidatorWalletsRepository';

@injectable()
export class ValidatorsWalletsScanner {
  @inject('Logger') private logger!: Logger;
  @inject('Settings') protected settings!: Settings;

  @inject(StakingBankValidatorsRepository) private stakingBankValidatorsRepository: StakingBankValidatorsRepository;
  @inject(ValidatorWalletsRepository) private validatorWalletsRepository: ValidatorWalletsRepository;

  call = async (chainId: ChainsIds): Promise<void> => {
    const validators = await this.stakingBankValidatorsRepository.apply(chainId);
    this.logger.info(`[ValidatorsWalletsScanner][${chainId}] pulled ${validators.length} validators`);
    const data = await this.fetchValidatorsWallets(chainId, validators);
    await this.validatorWalletsRepository.save(chainId, data);
  };

  private async fetchValidatorsWallets(chainId: ChainsIds, validators: IValidator[]): Promise<IValidatorWallets[]> {
    return Promise.all(validators.map((v) => this.fetchWallets(chainId, v)));
  }

  private async fetchWallets(chainId: ChainsIds, validator: IValidator): Promise<IValidatorWallets> {
    const response = await axios.get(`${validator.location}/info?details=${chainId}`);

    return <IValidatorWallets>{
      chainId,
      deviation: response.data.chains[chainId].deviationWalletAddress ?? '',
      signer: response.data.chains[chainId].walletAddress ?? '',
    };
  }
}
