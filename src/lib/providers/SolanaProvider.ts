import { IProvider } from './IProvider';
import { BlockchainSettings } from '../../types/Settings';
import { BlockchainProps } from '../Blockchain';
import { ChainsIds } from '../../types/ChainsIds';
import { BigNumber } from 'ethers';
import { Provider, Wallet, web3 } from '@project-serum/anchor';
import { PublicKey } from '@solana/web3.js';
import { getKeyPairFromSecretKeyString } from '../../utils/solana';
import { NetworkStatus } from '../../types/Network';

export class SolanaProvider implements IProvider {
  readonly chainId = ChainsIds.SOLANA;
  readonly provider!: Provider;
  readonly wallet!: Wallet;
  readonly settings!: BlockchainSettings;

  constructor(props: BlockchainProps) {
    const { chainId, settings } = props;
    this.settings = (<Record<string, BlockchainSettings>>settings.blockchain.multiChains)[chainId];

    if (!this.settings.providerUrl) {
      return;
    }

    this.wallet = new Wallet(getKeyPairFromSecretKeyString(settings.blockchain.solana.replicatorSecretKey));

    this.provider = new Provider(new web3.Connection(this.settings.providerUrl, 'confirmed'), this.wallet, {
      commitment: 'confirmed',
      maxRetries: 20, // review this at a later date
      preflightCommitment: 'confirmed',
      skipPreflight: false,
    });
  }

  async getBlockNumber(): Promise<number> {
    const latestBlockHashResponse = await this.provider.connection.getLatestBlockhash();

    return latestBlockHashResponse?.lastValidBlockHeight ?? null;
  }

  async getBalance(address: string): Promise<BigNumber> {
    const balance = await this.provider.connection.getBalance(new PublicKey(address));

    if (balance) {
      return BigNumber.from(balance);
    }

    return null;
  }

  getNetwork = (): NetworkStatus => {
    const mainnetRegExp = new RegExp(/(mainnet)/);
    const rpc = mainnetRegExp.test(this.settings.providerUrl) ? 'mainnet' : 'devnet';

    return { name: `solana-${rpc}`, id: 0 };
  };

  async getTransactionCount(address: string): Promise<number> {
    // this will get updated, if we integrate program-derived nonces
    return null;
  }

  async call(transaction: { to: string; data: string }): Promise<string> {
    // this is only needed for new chain architecture detection
    // once we create new chain for solana, we will need to implement this method
    throw new Error('solana.call not supported yet');
  }
}
