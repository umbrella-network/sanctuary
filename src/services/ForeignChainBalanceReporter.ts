import { injectable } from 'inversify';
import { ChainsIds, ForeignChainsIds } from '../types/ChainsIds';
import BalanceReporter, { IBalanceReport } from './BalanceReporter';

@injectable()
class ForeignChainBalanceReporter extends BalanceReporter {
  call = async (chainsIds: ChainsIds[] = ForeignChainsIds): Promise<void> => {
    const chainsWithBalance = await Promise.all(chainsIds.map(this.fetchBalanceOfReplicator));
    this.reportBalances(chainsWithBalance);
  };

  private fetchBalanceOfReplicator = async (chainId: ChainsIds): Promise<IBalanceReport> => {
    const blockchain = this.blockchainRepository.get(chainId);
    const address = blockchain.wallet.address;
    const balance = await blockchain.balanceOf(address);
    return {
      balance: this.bigNumberToBalance(balance),
      address,
      chain: chainId,
      currency: this.getCurrencyFromChain(chainId),
    };
  };

  private getCurrencyFromChain(chain: string): string {
    const currencies: { [chainId: string]: string } = {
      avax: 'AVAX',
      ethereum: 'ETH',
      polygon: 'MATIC',
    };
    return currencies[chain];
  }
}

export default ForeignChainBalanceReporter;
