import { inject, injectable } from 'inversify';
import { ChainStatus } from '../types/ChainStatus';
import { ChainContract } from '../contracts/ChainContract';
import { ChainContractRepository } from '../repositories/ChainContractRepository';
import { Blockchain } from '../lib/Blockchain';
import BalanceReporter, { IBalanceReport } from './BalanceReporter';

@injectable()
class HomechainBalanceReporter extends BalanceReporter {
  @inject(ChainContractRepository) chainContractRepository!: ChainContractRepository;

  private chainContract!: ChainContract;
  private homechainId: string;
  private homechain: Blockchain;

  call = async (): Promise<void> => {
    this.setupHomechain();
    const validators = await this.fetchValidators();
    this.reportBalances(validators);
  };

  private setupHomechain(): void {
    this.homechainId = this.settings.blockchain.homeChain.chainId;
    this.homechain = this.blockchainRepository.get(this.homechainId);
    this.chainContract = <ChainContract>this.chainContractRepository.get(this.homechainId);
  }

  private fetchValidators = async (): Promise<IBalanceReport[]> => {
    const { validators: validatorsIds } = await this.chainContract.resolveStatus<ChainStatus>();
    const validators = await Promise.all(validatorsIds.map(this.fetchValidator));
    return validators;
  };

  private fetchValidator = async (validatorId: string): Promise<IBalanceReport> => {
    const balance = await this.homechain.balanceOf(validatorId);
    return {
      address: validatorId,
      balance: this.bigNumberToBalance(balance),
      chain: this.homechainId,
      currency: 'BNB',
    };
  };
}

export default HomechainBalanceReporter;
