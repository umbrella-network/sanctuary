import 'reflect-metadata';
import { expect } from 'chai';
import { BigNumber } from 'ethers';
import { ChainsIds } from '../../src/types/ChainsIds';
import { SolanaBlockchain } from '../../src/lib/blockchains/SolanaBlockchain';
import { SolanaProvider } from '../../src/lib/providers/SolanaProvider';
import { IProvider } from '../../src/lib/providers/IProvider';
import { SolanaWallet } from '../../src/lib/wallets/SolanaWallet';
import { IWallet } from '../../src/lib/wallets/IWallet';
import { getKeyPairFromSecretKeyString } from '../../src/utils/solana';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import settings from '../../src/config/settings';

describe('SolanaForeignChainContract', () => {
  let solanaBlockchain: SolanaBlockchain, replicatorAddress: string;

  const currencyConversionTestCases = [
    { sol: 1, lamports: BigNumber.from(LAMPORTS_PER_SOL) },
    { sol: 15, lamports: BigNumber.from(15 * LAMPORTS_PER_SOL) },
    { sol: 100.25, lamports: BigNumber.from(100.25 * LAMPORTS_PER_SOL) },
    { sol: 100.25, lamports: BigNumber.from(100.25 * LAMPORTS_PER_SOL) },
    { sol: 0, lamports: BigNumber.from(0) },
    { sol: '0.34', lamports: BigNumber.from(0.34 * LAMPORTS_PER_SOL) },
    { sol: '100', lamports: BigNumber.from(100 * LAMPORTS_PER_SOL) },
  ];

  before(async () => {
    solanaBlockchain = new SolanaBlockchain({ chainId: ChainsIds.SOLANA, settings });
    replicatorAddress = getKeyPairFromSecretKeyString(
      settings.blockchain.solana.replicatorSecretKey
    ).publicKey.toBase58();
  });

  describe('#getProvider', () => {
    it('should return an instance of SolanaProvider', async () => {
      const provider = await solanaBlockchain.getProvider();
      expect(!!provider).to.eql(true);
      expect(provider instanceof SolanaProvider).to.eql(true);
      expect(<IProvider>provider).to.not.throw;
    });
  });

  describe('#getWallet', () => {
    it('should return an instance of SolanaWallet', async () => {
      const wallet = await solanaBlockchain.getWallet();
      expect(!!wallet).to.eql(true);
      expect(wallet instanceof SolanaWallet).to.eql(true);
      expect(<IWallet>wallet).to.not.throw;
    });
  });

  describe('#getBlockNumber', () => {
    it('should return the latest block', async () => {
      const blockNumber = await solanaBlockchain.getBlockNumber();
      expect(!!blockNumber).to.eql(true);
      expect(blockNumber > 0).to.eql(true);
    });
  });

  describe('#getLastNonce', () => {
    it('should return null, as there is no such method in solana rpc interface', async () => {
      const lastNonce = await solanaBlockchain.getLastNonce();
      expect(!!lastNonce).to.eql(false);
    });
  });

  describe('#balanceOf', () => {
    it('should return the current balance as a BigNumber', async () => {
      const balance = await solanaBlockchain.balanceOf(replicatorAddress);
      expect(!!balance).to.eql(true);
      expect(balance.toNumber() > 0).to.eql(true);
    });
  });

  describe('#getContractRegistryAddress', () => {
    it('should return null, as teh registry has not yet been implemented', async () => {
      const registry = solanaBlockchain.getContractRegistryAddress();
      expect(!!registry).to.eql(false);
    });
  });

  describe('#getWalletBalance', () => {
    it('should return the current balance of the wallet as a BigNumber', async () => {
      const balance = await solanaBlockchain.getWalletBalance();
      expect(!!balance).to.eql(true);
      expect(balance.toNumber() > 0).to.eql(true);
    });
  });

  describe('#toBaseCurrency', () => {
    currencyConversionTestCases.forEach(({ sol, lamports }) => {
      it(`should convert ${sol} SOL into ${lamports} lamports as a BigNumber`, async () => {
        const output = solanaBlockchain.toBaseCurrency(sol);
        expect(output.eq(lamports)).to.eql(true);
      });
    });
  });

  describe('#fromBaseCurrency', () => {
    const moreTestCases = [
      { sol: BigNumber.from(7500), lamports: BigNumber.from(7500 * LAMPORTS_PER_SOL) },
      { sol: BigNumber.from(0), lamports: BigNumber.from(0) },
      { sol: BigNumber.from(7), lamports: BigNumber.from(7 * LAMPORTS_PER_SOL) },
    ];

    [...currencyConversionTestCases, ...moreTestCases].forEach(({ sol, lamports }) => {
      it(`should convert ${lamports} lamports into ${sol} SOL`, async () => {
        const output = solanaBlockchain.fromBaseCurrency(lamports);
        switch (typeof sol) {
          case 'string':
            expect(output).to.eql(parseFloat(sol));
            break;
          case 'number':
            expect(output).to.eql(sol);
            break;
          default:
            expect(output).to.eql(sol.toNumber());
        }
      });
    });
  });

  describe('#containsNonceError', () => {
    const nonceErrorTestCasesPositive = [
      'stored nonce is still in recent_blockhashes',
      'specified nonce does not match stored nonce',
      'cannot handle request in current account state',
    ];

    nonceErrorTestCasesPositive.forEach((errorMessage) => {
      it('should return true for nonce error messages', async () => {
        try {
          throw new Error(errorMessage);
        } catch (err) {
          expect(solanaBlockchain.containsNonceError(err.message)).to.eql(true);
        }
      });
    });

    const nonceErrorTestCasesNegative = [
      'Transaction simulation failed',
      'Error: InvalidAccountData Program',
      'unexpected type, use Uint8Array',
    ];

    nonceErrorTestCasesNegative.forEach((errorMessage) => {
      it('should return false for other error messages', async () => {
        try {
          throw new Error(errorMessage);
        } catch (err) {
          expect(solanaBlockchain.containsNonceError(err.message)).to.eql(false);
        }
      });
    });
  });
});
