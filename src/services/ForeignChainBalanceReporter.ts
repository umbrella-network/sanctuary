import { injectable } from 'inversify';
import { ChainCurrencyEnum } from '../types/ChainCurrency';
import { ChainsIds as ChainId, ForeignChainsIds } from '../types/ChainsIds';
import BalanceReporter, { BlockReport } from './BalanceReporter';

@injectable()
class ForeignChainBalanceReporter extends BalanceReporter {
  async call(chainsIds: ChainId[] = ForeignChainsIds): Promise<void> {
    const replicatorsBalances = await Promise.all(chainsIds.map(this.fetchBalanceOfReplicator));
    this.reportBalances(replicatorsBalances);
  }

  private fetchBalanceOfReplicator = async (chainId: ChainId): Promise<BlockReport> => {
    const blockchain = this.blockchainRepository.get(chainId);
    const address = blockchain.wallet.address;
    const balance = await blockchain.balanceOf(address);

    return {
      balance: this.bigNumberToBalance(balance),
      address,
      chain: chainId.replace('ethereum', 'eth'),
      currency: ChainCurrencyEnum[chainId],
    };
  };
}

export default ForeignChainBalanceReporter;
