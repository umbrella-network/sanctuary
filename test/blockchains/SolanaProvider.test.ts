import 'reflect-metadata';
import { expect } from 'chai';
import { ChainsIds } from '../../src/types/ChainsIds';
import { SolanaProvider } from '../../src/lib/providers/SolanaProvider';
import { getKeyPairFromSecretKeyString } from '../../src/utils/solana';
import settings from '../../src/config/settings';

describe('SolanaForeignChainContract', () => {
  let solanaProvider: SolanaProvider, replicatorAddress: string;

  before(async () => {
    solanaProvider = new SolanaProvider({ chainId: ChainsIds.SOLANA, settings });
    replicatorAddress = getKeyPairFromSecretKeyString(
      settings.blockchain.solana.replicatorSecretKey
    ).publicKey.toBase58();
  });

  describe('#getBlockNumber', () => {
    it('should return the latest block', async () => {
      const blockNumber = await solanaProvider.getBlockNumber();
      expect(!!blockNumber).to.eql(true);
      expect(blockNumber > 0).to.eql(true);
    });
  });

  describe('#getBalance', () => {
    it('should return the current balance as a BigNumber', async () => {
      const balance = await solanaProvider.getBalance(replicatorAddress);
      expect(!!balance).to.eql(true);
      expect(balance.toNumber() > 0).to.eql(true);
    });
  });

  describe('#getTransactionCount', () => {
    it('should return null, as there is no such method in solana rpc interface', async () => {
      const count = await solanaProvider.getTransactionCount(replicatorAddress);
      expect(!!count).to.eql(false);
    });
  });
});
