import { inject, injectable, postConstruct } from 'inversify';
import { ChainStatus } from '../types/ChainStatus';
import { ChainContract } from '../contracts/ChainContract';
import { ChainContractRepository } from '../repositories/ChainContractRepository';
import { Blockchain } from '../lib/Blockchain';
import BalanceReporter, { BlockReport } from './BalanceReporter';
import { ChainCurrencyEnum } from '../types/ChainCurrency';

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

  async call(): Promise<void> {
    const validators = await this.fetchValidators();
    this.reportBalances(validators);
  }

  private async fetchValidators(): Promise<BlockReport[]> {
    const { validators: validatorsIds, locations } = await this.chainContract.resolveStatus<ChainStatus>();
    const validators = await Promise.all(
      validatorsIds.map((validatorId, index) => this.fetchValidator(validatorId, locations[index]))
    );
    return validators;
  }

  private fetchValidator = async (validatorId: string, validatorUrl: string): Promise<BlockReport> => {
    const balance = await this.homechain.balanceOf(validatorId);
    return {
      address: validatorId,
      balance: this.bigNumberToBalance(balance),
      chain: this.homechainId,
      location: validatorUrl,
      currency: ChainCurrencyEnum.bsc,
    };
  };
}

export default HomechainBalanceReporter;
