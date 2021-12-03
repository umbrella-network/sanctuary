import newrelic from 'newrelic';
import { inject, injectable } from 'inversify';
import { Logger } from 'winston';
import { BlockchainRepository } from '../repositories/BlockchainRepository';
import { BigNumber } from '@ethersproject/bignumber';
import Settings from '../types/Settings';

export type IBalanceReport = {
  address: string;
  chain: string;
  balance: number;
  currency: string;
  location?: string;
};

@injectable()
abstract class BalanceReporter {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(BlockchainRepository) blockchainRepository!: BlockchainRepository;

  protected bigNumberToBalance(n: BigNumber): number {
    return n.div('10000000000000000').toNumber() / 100;
  }

  protected reportBalances(blockchains: IBalanceReport[]): void {
    blockchains.forEach(this.logReport);
    blockchains.forEach(this.recordEvent);
  }

  private logReport = ({ chain, balance, currency, address }: IBalanceReport): void => {
    const instance = this.constructor.name;
    this.logger.info(`[${instance}] ChainID: ${chain}, Balance: ${balance} ${currency}, Address: ${address}`);
  };

  protected recordEvent = ({ address, balance, chain, currency, location }: IBalanceReport): void => {
    newrelic.recordCustomEvent('WalletBalanceReport', {
      balance,
      address,
      chain,
      currency,
      env: this.settings.environment,
      location,
    });
  };
}

export default BalanceReporter;
