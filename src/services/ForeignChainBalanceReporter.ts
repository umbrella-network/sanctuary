import newrelic from 'newrelic';
import { inject, injectable } from 'inversify';
import { Logger } from 'winston';
import { BlockchainRepository } from '../repositories/BlockchainRepository';
import { ChainsIds, ForeignChainsIds } from '../types/ChainsIds';
import { BigNumber } from '@ethersproject/bignumber';

interface IForeignChainBalanceReport {
  address: string;
  chainId: string;
  balance: BigNumber;
}

@injectable()
class ForeignChainBalanceReporter {
  @inject('Logger') logger!: Logger;
  @inject(BlockchainRepository) blockchainRepository!: BlockchainRepository;

  call = async (chainsIds: ChainsIds[] = ForeignChainsIds): Promise<void> => {
    const chainsWithBalance = await Promise.all(chainsIds.map(this.fetchBalanceOfReplicator));
    this.reportForeignChainsBalances(chainsWithBalance);
  };

  private fetchBalanceOfReplicator = async (chainId: ChainsIds): Promise<IForeignChainBalanceReport> => {
    const blockchain = this.blockchainRepository.get(chainId);
    const address = blockchain.wallet.address;
    const balance = await blockchain.balanceOf(address);
    return { balance, address, chainId };
  };

  private reportForeignChainsBalances(blockchains: IForeignChainBalanceReport[]): void {
    this.logReports(blockchains);
    blockchains.forEach(this.recordEvents);
  }

  private logReports(blockchains: IForeignChainBalanceReport[]): void {
    blockchains.forEach(({ chainId, balance, address }) => {
      this.logger.info(
        `[ForeignChainBalanceReporter] ChainID: ${chainId}, Balance: ${balance.toBigInt()}, Address: ${address}`
      );
    });
  }

  private recordEvents = ({ address, balance, chainId }: IForeignChainBalanceReport): void => {
    newrelic.recordCustomEvent('WalletBalanceReport', {
      balance: balance.toString(),
      address: address,
      chain: chainId,
      node: 'ForeignChainReplicator',
    });
  };
}

export default ForeignChainBalanceReporter;
