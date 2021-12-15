import { injectable } from 'inversify';
import { ChainCurrencyEnum } from '../types/ChainCurrency';
import { ChainsIds as ChainId, ForeignChainsIds } from '../types/ChainsIds';
import BalanceReporter, { BlockReport } from './BalanceReporter';

interface PromiseResult {
  status: 'fulfilled' | 'rejected';
  value?: BlockReport;
  reason?: any;
}
@injectable()
class ForeignChainBalanceReporter extends BalanceReporter {
  async call(chainsIds: ChainId[] = ForeignChainsIds): Promise<void> {
    const replicatorsBalances = await Promise.allSettled(chainsIds.map(this.fetchBalanceOfReplicator));
    this.reportBalances(this.filterResolved(replicatorsBalances));
    this.logRejectedResults(this.filterRejected(replicatorsBalances));
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

  private filterResolved(results: PromiseResult[]): BlockReport[] {
    return results.filter((result) => result.status === 'fulfilled').map((result) => result.value);
  }

  private filterRejected(results: PromiseResult[]) {
    return results.filter((result) => result.status === 'rejected').map((result) => result.reason);
  }

  private logRejectedResults(reports: BlockReport[]): void {
    if (reports.length > 0) {
      this.logger.error(`[ForeignChainBalanceReporter] failed to fetch data from foreing chains ${reports}`);
    }
  }
}

export default ForeignChainBalanceReporter;
