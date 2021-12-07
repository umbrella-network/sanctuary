import newrelic from 'newrelic';
import { inject, injectable } from 'inversify';
import { Logger } from 'winston';
import { BlockchainRepository } from '../repositories/BlockchainRepository';
import { BigNumber } from '@ethersproject/bignumber';
import Settings from '../types/Settings';

export type BlockReport = {
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

  protected reportBalances(blockchains: BlockReport[]): void {
    blockchains.forEach(this.logReport);
    blockchains.forEach(this.recordEvent);
  }

  private logReport = ({ chain, balance, currency, address }: BlockReport): void => {
    const className = this.constructor.name;
    this.logger.info(`[${className}] ChainID: ${chain}, Balance: ${balance} ${currency}, Address: ${address}`);
  };

  protected recordEvent = ({ address, balance, chain, currency, location }: BlockReport): void => {
    try {
      newrelic.recordCustomEvent('WalletBalanceReport', {
        balance,
        address,
        chain,
        currency,
        env: this.settings.environment,
        location,
      });
    } catch (e) {
      this.logger.error(`[BalanceReporter] Failed to report balances to NewRelic. ${e.toString()}`);
    }
  };
}

export default BalanceReporter;
