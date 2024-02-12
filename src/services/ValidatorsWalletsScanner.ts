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

  async call(chainId: ChainsIds): Promise<void> {
    const validators = await this.stakingBankValidatorsRepository.apply(chainId);
    const data = await this.fetchValidatorsWallets(chainId, validators);
    const saved = await this.validatorWalletsRepository.save(chainId, data);
    this.logger.info(`[ValidatorsWalletsScanner][${chainId}] saved ${saved.length} validators`);
  }

  private async fetchValidatorsWallets(chainId: ChainsIds, validators: IValidator[]): Promise<IValidatorWallets[]> {
    const responses = await Promise.all(validators.map((v) => this.fetchWallets(chainId, v)));
    return responses.filter((r) => !!r);
  }

  private async fetchWallets(chainId: ChainsIds, validator: IValidator): Promise<IValidatorWallets | undefined> {
    try {
      const response = await axios.get(`${validator.location}/info?details=${chainId}`, { timeout: 3000 });

      return <IValidatorWallets>{
        chainId,
        deviation: response.data.chains[chainId].deviationWalletAddress ?? '',
        signer: response.data.chains[chainId].walletAddress ?? '',
      };
    } catch (e) {
      this.logger.error(`[ValidatorsWalletsScanner][${chainId} error: ${e.message}`);
      return;
    }
  }
}
