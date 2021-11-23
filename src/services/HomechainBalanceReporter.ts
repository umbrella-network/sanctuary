import newrelic from 'newrelic';
import { inject, injectable } from 'inversify';
import { ChainStatus } from '../types/ChainStatus';
import { Logger } from 'winston';
import { ChainContract } from '../contracts/ChainContract';
import { BlockchainRepository } from '../repositories/BlockchainRepository';
import Settings from '../types/Settings';
import { BigNumber } from '@ethersproject/bignumber';
import { ChainContractRepository } from '../repositories/ChainContractRepository';
import { Blockchain } from '../lib/Blockchain';

interface IValidatorReport {
  address: string;
  balance: BigNumber;
}

@injectable()
class HomechainBalanceReporter {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(BlockchainRepository) blockchainRepository!: BlockchainRepository;
  @inject(ChainContractRepository) chainContractRepository!: ChainContractRepository;

  private chainContract!: ChainContract;
  private homechainId: string;
  private homechain: Blockchain;

  call = async (): Promise<void> => {
    this.setupHomechain();
    const validators = await this.fetchValidators();
    this.reportValidatorsBalances(validators);
  };

  private setupHomechain(): void {
    this.homechainId = this.settings.blockchain.homeChain.chainId;
    this.homechain = this.blockchainRepository.get(this.homechainId);
    this.chainContract = <ChainContract>this.chainContractRepository.get(this.homechainId);
  }

  private fetchValidators = async (): Promise<IValidatorReport[]> => {
    const { validators: validatorsIds } = await this.chainContract.resolveStatus<ChainStatus>();
    const validators = await Promise.all(validatorsIds.map(this.fetchValidator));
    return validators;
  };

  private fetchValidator = async (validatorId: string): Promise<IValidatorReport> => {
    const balance = await this.homechain.balanceOf(validatorId);
    return { address: validatorId, balance };
  };

  private reportValidatorsBalances(validators: IValidatorReport[]): void {
    this.logReports(validators);
    validators.forEach(this.recordEvent);
  }

  private logReports(validators: IValidatorReport[]): void {
    validators.forEach(({ balance, address }) => {
      this.logger.info(
        `[HomechainBalanceReporter] ChainID: ${this.homechainId}, Balance: ${balance.toBigInt()}, Address: ${address}`
      );
    });
  }

  private recordEvent = ({ balance, address }: IValidatorReport): void => {
    newrelic.recordCustomEvent('WalletBalanceReport', {
      balance: balance.toString(),
      address: address,
      chain: this.homechainId,
      node: 'ForeignChainReplicator',
    });
  };
}

export default HomechainBalanceReporter;
