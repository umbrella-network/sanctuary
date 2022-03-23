import 'reflect-metadata';
import { expect } from 'chai';
import { SolanaWallet } from '../../src/lib/wallets/SolanaWallet';
import { Provider, Wallet, web3 } from '@project-serum/anchor';
import { getKeyPairFromSecretKeyString } from '../../src/utils/solana';
import settings from '../../src/config/settings';

describe('SolanaForeignChainContract', () => {
  let solanaWallet: SolanaWallet;

  before(async () => {
    const wallet = new Wallet(getKeyPairFromSecretKeyString(settings.blockchain.solana.replicatorSecretKey));

    const provider = new Provider(
      new web3.Connection(settings.blockchain.multiChains.solana.providerUrl, 'confirmed'),
      wallet,
      {
        commitment: 'confirmed',
        maxRetries: 20, // ?
        preflightCommitment: 'confirmed',
        skipPreflight: false,
      }
    );

    solanaWallet = new SolanaWallet({ provider, settings, wallet });
  });

  describe('#getBalance', () => {
    it('should return the current balance as a BigNumber', async () => {
      const balance = await solanaWallet.getBalance();
      expect(!!balance).to.eql(true);
      expect(balance.toNumber() > 0).to.eql(true);
    });
  });

  describe('#address', () => {
    it('address should be set to the replicator', async () => {
      expect(solanaWallet.address).to.eql(
        getKeyPairFromSecretKeyString(settings.blockchain.solana.replicatorSecretKey).publicKey.toBase58()
      );
    });
  });
});
