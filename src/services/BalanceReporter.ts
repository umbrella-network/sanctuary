import newrelic from 'newrelic';
import { inject, injectable } from 'inversify';
import { Logger } from 'winston';
import { BlockchainRepository } from '../repositories/BlockchainRepository';
import { BigNumber } from '@ethersproject/bignumber';
import Settings from '../types/Settings';

const REQUIRED_DECIMAL_CASES = 18;
const DECIMAL_CASE_POSITION = /(\d)(?=\d{17}$)/g;

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
    const paddedNumber = bigNumber
      .toBigInt()
      .toString()
      .padStart(REQUIRED_DECIMAL_CASES + 1, '0');
    const number = paddedNumber.replace(DECIMAL_CASE_POSITION, '.$1');
    return Number(this.shortenToNDecimalCases(number, 8));
  }

  private shortenToNDecimalCases(number: string, cases: number) {
    return number.slice(0, number.indexOf('.') + cases + 1);
  }

  protected reportBalances(blockchains: IBalanceReport[]): void {
    blockchains.forEach(this.logReport);
    blockchains.forEach(this.recordEvent);
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
