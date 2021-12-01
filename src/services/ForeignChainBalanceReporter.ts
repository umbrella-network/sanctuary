import { injectable } from 'inversify';
import { ChainsCurrencies } from '../types/ChainsCurrencies';
import { ChainsIds, ForeignChainsIds } from '../types/ChainsIds';
import BalanceReporter, { IBalanceReport } from './BalanceReporter';

@injectable()
class ForeignChainBalanceReporter extends BalanceReporter {
  public async call(chainsIds: ChainsIds[] = ForeignChainsIds): Promise<void> {
    const replicatorsBalances = await Promise.all(chainsIds.map(this.fetchBalanceOfReplicator));
    this.reportBalances(replicatorsBalances);
  }

  private fetchBalanceOfReplicator = async (chainId: ChainsIds): Promise<IBalanceReport> => {
    const blockchain = this.blockchainRepository.get(chainId);
    const address = blockchain.wallet.address;
    const balance = await blockchain.balanceOf(address);

    return {
      balance: this.bigNumberToBalance(balance),
      address,
      chain: chainId.replace('ethereum', 'eth'),
      currency: ChainsCurrencies[chainId],
    };
  };
}

export default ForeignChainBalanceReporter;
