import { inject, injectable } from 'inversify';
import { ChainStatus } from '../types/ChainStatus';
import { ChainContract } from '../contracts/ChainContract';
import { ChainContractRepository } from '../repositories/ChainContractRepository';
import { Blockchain } from '../lib/Blockchain';
import BalanceReporter, { IBalanceReport } from './BalanceReporter';

@injectable()
class HomechainBalanceReporter extends BalanceReporter {
  @inject(ChainContractRepository) chainContractRepository!: ChainContractRepository;

  call = async (): Promise<void> => {
    const validators = await this.fetchValidators();
    this.reportBalances(validators);
  };

  private fetchValidators = async (): Promise<IBalanceReport[]> => {
    const { validators: validatorsIds } = await this.getChainContract().resolveStatus<ChainStatus>();
    const validators = await Promise.all(validatorsIds.map(this.fetchValidator));
    return validators;
  };

  private getChainContract() {
    const homechainId = this.getHomechainId();
    return <ChainContract>this.chainContractRepository.get(homechainId);
  }

  private fetchValidator = async (validatorId: string): Promise<IBalanceReport> => {
    const balance = await this.getHomechain().balanceOf(validatorId);
    return {
      address: validatorId,
      balance: this.bigNumberToBalance(balance),
      chain: this.getHomechainId(),
      currency: 'BNB',
    };
  };

  private getHomechain(): Blockchain {
    const homechainId = this.getHomechainId();
    return this.blockchainRepository.get(homechainId);
  }

  private getHomechainId(): string {
    return this.settings.blockchain.homeChain.chainId;
  }
}

export default HomechainBalanceReporter;
