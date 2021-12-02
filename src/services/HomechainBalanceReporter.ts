import { inject, injectable, postConstruct } from 'inversify';
import { ChainStatus } from '../types/ChainStatus';
import { ChainContract } from '../contracts/ChainContract';
import { ChainContractRepository } from '../repositories/ChainContractRepository';
import { Blockchain } from '../lib/Blockchain';
import BalanceReporter, { IBalanceReport } from './BalanceReporter';
import { ChainsCurrencies } from '../types/ChainsCurrencies';

@injectable()
class HomechainBalanceReporter extends BalanceReporter {
  private homechainId: string;
  private homechain: Blockchain;
  private chainContract: ChainContract;

  @inject(ChainContractRepository) chainContractRepository!: ChainContractRepository;

  @postConstruct()
  setup(): void {
    this.homechainId = this.settings.blockchain.homeChain.chainId;
    this.homechain = this.blockchainRepository.get(this.homechainId);
    this.chainContract = <ChainContract>this.chainContractRepository.get(this.homechainId);
  }

  public async call(): Promise<void> {
    const validators = await this.fetchValidators();
    this.reportBalances(validators);
  }

  private async fetchValidators(): Promise<IBalanceReport[]> {
    const { validators: validatorsIds } = await this.chainContract.resolveStatus<ChainStatus>();
    const validators = await Promise.all(validatorsIds.map(this.fetchValidator));
    return validators;
  }

  private fetchValidator = async (validatorId: string): Promise<IBalanceReport> => {
    const balance = await this.homechain.balanceOf(validatorId);
    return {
      address: validatorId,
      balance: this.bigNumberToBalance(balance),
      chain: this.homechainId,
      currency: ChainsCurrencies.bsc,
    };
  };
}

export default HomechainBalanceReporter;
