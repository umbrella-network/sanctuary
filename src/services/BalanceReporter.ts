import newrelic from 'newrelic';
import { inject, injectable } from 'inversify';
import { Logger } from 'winston';
import { BlockchainRepository } from '../repositories/BlockchainRepository';
import { BigNumber } from '@ethersproject/bignumber';
import Settings from '../types/Settings';

export interface IBalanceReport {
  address: string;
  chain: string;
  balance: number;
  currency: string;
}

@injectable()
abstract class BalanceReporter {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(BlockchainRepository) blockchainRepository!: BlockchainRepository;

  protected bigNumberToBalance(bigNumber: BigNumber): number {
    const balance = Number(bigNumber.toBigInt()) / 1e18;
    return Number(balance.toFixed(8));
  }

  protected reportBalances(blockchains: IBalanceReport[]): void {
    this.logReports(blockchains);
    blockchains.forEach(this.recordEvent);
  }

  protected logReports(blockchains: IBalanceReport[]): void {
    blockchains.forEach(this.logReport);
  }

  private logReport = ({ chain, balance, currency, address }: IBalanceReport): void => {
    const instance = this.constructor.name;
    this.logger.info(`[${instance}] ChainID: ${chain}, Balance: ${balance} ${currency}, Address: ${address}`);
  };

  protected recordEvent = ({ address, balance, chain, currency }: IBalanceReport): void => {
    newrelic.recordCustomEvent('WalletBalanceReport', {
      balance,
      address,
      chain,
      currency,
      env: this.settings.environment,
    });
  };
}

export default BalanceReporter;
