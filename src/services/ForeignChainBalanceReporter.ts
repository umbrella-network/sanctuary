import { injectable } from 'inversify';
import { ChainCurrencyEnum } from '../types/ChainCurrency';
import { ChainsIds as ChainId, ForeignChainsIds, NonEvmChainsIds } from '../types/ChainsIds';
import BalanceReporter, { BlockReport } from './BalanceReporter';

type PromiseResultStatus = 'fulfilled' | 'rejected';

interface PromiseResult {
  status: PromiseResultStatus;
  value?: BlockReport;
  reason?: string;
}

@injectable()
class ForeignChainBalanceReporter extends BalanceReporter {
  async call(chainsIds: ChainId[] = ForeignChainsIds): Promise<void> {
    const replicatorsBalances = await Promise.allSettled(chainsIds.map(this.fetchBalanceOfReplicator));
    const { resolved, rejected } = this.filterResults(replicatorsBalances);
    this.reportBalances(resolved);
    this.logRejectedResults(rejected);
  }

  private fetchBalanceOfReplicator = async (chainId: ChainId): Promise<BlockReport> => {
    let blockchain, address, balance;

    if (NonEvmChainsIds.includes(chainId)) {
      blockchain = this.blockchainRepository.getGeneric(chainId);
      address = blockchain.wallet.address;
      balance = blockchain.fromBaseCurrency(await blockchain.getWalletBalance());
    } else {
      blockchain = this.blockchainRepository.get(chainId);
      address = blockchain.wallet.address;
      balance = this.bigNumberToBalance(await blockchain.balanceOf(address));
    }

    return {
      balance,
      address,
      chain: chainId.replace('ethereum', 'eth'),
      currency: ChainCurrencyEnum[chainId],
    };
  };

  private filterResults(results: PromiseResult[]) {
    const successful = results.filter(({ status }) => status === 'fulfilled').map(({ value }) => value);
    const rejected = results
      .filter(({ status }) => status === 'rejected')
      .map(({ reason }) => reason)
      .join(',');
    return {
      resolved: successful as BlockReport[],
      rejected: rejected as string,
    };
  }

  private logRejectedResults(rejectionMessages: string): void {
    if (rejectionMessages) {
      this.logger.error(`[ForeignChainBalanceReporter] failed to fetch data from foreing chains ${rejectionMessages}`);
    }
  }
}

export default ForeignChainBalanceReporter;
