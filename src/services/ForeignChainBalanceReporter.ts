import newrelic from 'newrelic';
import { inject, injectable } from 'inversify';
import { Logger } from 'winston';
import { BlockchainRepository } from '../repositories/BlockchainRepository';
import { ChainsIds, ForeignChainsIds } from '../types/ChainsIds';
import { BigNumber } from '@ethersproject/bignumber';
import Settings from '../types/Settings';

interface IForeignChainBalanceReport {
  address: string;
  chainId: string;
  balance: number;
  currency: string;
}

@injectable()
class ForeignChainBalanceReporter {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(BlockchainRepository) blockchainRepository!: BlockchainRepository;

  call = async (chainsIds: ChainsIds[] = ForeignChainsIds): Promise<void> => {
    const chainsWithBalance = await Promise.all(chainsIds.map(this.fetchBalanceOfReplicator));
    this.reportForeignChainsBalances(chainsWithBalance);
  };

  private fetchBalanceOfReplicator = async (chainId: ChainsIds): Promise<IForeignChainBalanceReport> => {
    const blockchain = this.blockchainRepository.get(chainId);
    const address = blockchain.wallet.address;
    const balance = await blockchain.balanceOf(address);
    return {
      balance: this.bigNumberToBalance(balance),
      address,
      chainId,
      currency: this.getCurrencyFromChain(chainId),
    };
  };

  private bigNumberToBalance(bigNumber: BigNumber): number {
    const balance = Number(bigNumber.toBigInt()) / 1e18;
    return Number(balance.toFixed(8));
  }

  private getCurrencyFromChain(chain: string): string {
    const currencies: { [chainId: string]: string } = {
      avax: 'AVAX',
      ethereum: 'ETH',
      polygon: 'MATIC',
    };
    return currencies[chain];
  }

  private reportForeignChainsBalances(blockchains: IForeignChainBalanceReport[]): void {
    this.logReports(blockchains);
    blockchains.forEach(this.recordEvents);
  }

  private logReports(blockchains: IForeignChainBalanceReport[]): void {
    blockchains.forEach(({ chainId, balance, address, currency }) => {
      this.logger.info(
        `[ForeignChainBalanceReporter] ChainID: ${chainId}, Balance: ${balance} ${currency}, Address: ${address}`
      );
    });
  }

  private recordEvents = ({ address, balance, chainId, currency }: IForeignChainBalanceReport): void => {
    newrelic.recordCustomEvent('WalletBalanceReport', {
      balance,
      address,
      chain: chainId,
      currency,
      env: this.settings.environment,
    });
  };
}

export default ForeignChainBalanceReporter;
