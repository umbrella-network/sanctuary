import { injectable } from 'inversify';
import { Logger } from 'winston';
import { BigNumber } from 'ethers';
import Settings from '../../types/Settings';
import { ForeignChainStatus } from '../../types/ForeignChainStatus';
import { IGenericBlockchain } from '../../lib/blockchains/IGenericBlockchain';
import { SolanaProvider } from '../../lib/providers/SolanaProvider';
import { SolanaWallet } from '../../lib/wallets/SolanaWallet';
import { ChainBlockData, ChainFCDsData } from '../../models/ChainBlockData';
import { FeedValue } from '@umb-network/toolbox/dist/types/Feed';
import { Program } from '@project-serum/anchor';
import { PublicKey, SystemProgram, TransactionResponse } from '@solana/web3.js';
import { Chain, IDL } from '../SolanaChainProgram';
import { sleep } from '../../utils/sleep';
import { getLogger } from '../../lib/getLogger';

import {
  IGenericForeignChainContract,
  GenericForeignChainContractProps,
  TransactionResult,
} from './IGenericForeignChainContract';

import { derivePDAFromBlockId, getPublicKeyForSeed, derivePDAFromFCDKey, encodeDataValue } from '../../utils/solana';

@injectable()
export class SolanaForeignChainContract implements IGenericForeignChainContract {
  readonly settings: Settings;
  readonly blockchain: IGenericBlockchain;
  address: string;

  private chainProgramId!: PublicKey;
  private chainProgram!: Program<Chain>;
  private statusPda!: PublicKey;
  private authorityPda!: PublicKey;

  protected logger!: Logger;

  constructor(props: GenericForeignChainContractProps) {
    this.blockchain = props.blockchain;
    this.settings = props.settings;
    this.logger = getLogger();
  }

  async submit(
    dataTimestamp: number,
    root: string,
    keys: string[],
    values: FeedValue[],
    blockId: number
  ): Promise<TransactionResult> {
    const [blockPda, seed] = await derivePDAFromBlockId(blockId, this.chainProgramId);

    const [submitSignature] = await Promise.allSettled([
      this.chainProgram.rpc.submit(
        seed,
        blockId,
        root.startsWith('0x') ? Buffer.from(root.slice(2), 'hex') : Buffer.from(root, 'hex'),
        dataTimestamp,
        {
          accounts: {
            owner: (<SolanaWallet>this.blockchain.wallet).wallet.publicKey,
            authority: this.authorityPda,
            block: blockPda,
            status: this.statusPda,
            systemProgram: SystemProgram.programId,
          },
        }
      ),
      this.submitFCDs(dataTimestamp, keys, values),
    ]);

    if (submitSignature.status === 'fulfilled') {
      const confirmedTransaction = await this.confirmTransaction(submitSignature.value);

      return {
        transactionHash: submitSignature.value,
        status: confirmedTransaction && confirmedTransaction.meta ? !confirmedTransaction.meta.err : false,
        blockNumber: confirmedTransaction && confirmedTransaction.slot ? confirmedTransaction.slot : null,
      };
    } else {
      this.logger.info(`[${this.blockchain.chainId}] Submit transaction failed.`);
    }

    return {
      transactionHash: null,
      status: false,
      blockNumber: null,
    };
  }

  async confirmTransaction(signature: string): Promise<TransactionResponse> {
    let confirmedTransaction;
    let retries = 0;

    while (retries <= this.settings.blockchain.solana.maxTransactionConfirmationRetries) {
      try {
        confirmedTransaction = await (<SolanaProvider>this.blockchain.getProvider()).provider.connection.getTransaction(
          signature
        );
      } catch (e) {
        this.logger.error(`[${this.blockchain.chainId}] Error confirming transaction: ${e}`);
      }

      if (confirmedTransaction) {
        break;
      }

      await sleep(this.settings.blockchain.solana.transactionConfirmationRetryTimeout);
      this.logger.info(`[${this.blockchain.chainId}] Failed to confirm submit transaction. Retrying`);
      retries++;
    }

    return confirmedTransaction;
  }

  async submitFCDs(dataTimestamp: number, keys: string[], values: FeedValue[]): Promise<void> {
    const promises = [];

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const value = values[i];

      const [fcdPda] = await derivePDAFromFCDKey(key, this.chainProgramId);

      promises.push(
        this.chainProgram.rpc.updateFirstClassData(
          key,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          encodeDataValue(value, key),
          dataTimestamp,
          {
            accounts: {
              owner: (<SolanaWallet>this.blockchain.wallet).wallet.publicKey,
              authority: this.authorityPda,
              fcd: fcdPda,
              status: this.statusPda,
              systemProgram: SystemProgram.programId,
            },
          }
        )
      );
    }

    await Promise.allSettled(promises);
  }

  async resolveContract(): Promise<void> {
    this.chainProgramId = new PublicKey(this.settings.blockchain.solana.chainProgramPublicKeyInitString);
    this.chainProgram = new Program(IDL, this.chainProgramId, (<SolanaProvider>this.blockchain.getProvider()).provider);
    this.statusPda = await getPublicKeyForSeed('status', this.chainProgramId);
    this.authorityPda = await getPublicKeyForSeed('authority', this.chainProgramId);
    this.address = this.chainProgramId.toBase58();
  }

  async resolveStatus(): Promise<ForeignChainStatus> {
    if (!this.chainProgram) {
      await this.resolveContract();
    }

    const blockNumber = await this.blockchain.getBlockNumber();
    const status = await this.chainProgram.account.status.fetch(this.statusPda);

    return {
      chainAddress: this.chainProgramId.toBase58(),
      blockNumber: BigNumber.from(blockNumber),
      timePadding: status.padding,
      lastDataTimestamp: status.lastDataTimestamp,
      lastId: status.lastId,
      nextBlockId: status.nextBlockId,
    };
  }

  // not implemented in chain program
  async blocksCountOffset(): Promise<number> {
    return 0;
  }

  async resolveBlockData(chainAddress: string, blockId: number): Promise<ChainBlockData> {
    const block = await this.chainProgram.account.block.fetch(await this.getBlockPda(chainAddress, blockId));
    const root = '0x' + Buffer.from(block.root).toString('hex');

    return {
      root: root,
      dataTimestamp: block.timestamp,
      affidavit: BigNumber.from(0), // not yet implemented
    };
  }

  // only used for homechain
  async resolveFCDs(chainAddress: string, keys: string[]): Promise<ChainFCDsData> {
    return [[], []];
  }

  async isFCDInitialized(key: string): Promise<boolean> {
    const [fcdPda] = await derivePDAFromFCDKey(key, this.chainProgramId);

    try {
      const fcd = await this.chainProgram.account.firstClassData.fetch(fcdPda);
      return !!fcd;
    } catch (e) {
      return false;
    }
  }

  async initializeFCD(key: string, value: FeedValue, timestamp: number): Promise<boolean> {
    const [fcdPda, seed] = await derivePDAFromFCDKey(key, this.chainProgramId);

    const transactionSignature = await this.chainProgram.rpc.initializeFirstClassData(
      seed,
      key,
      encodeDataValue(value, key),
      timestamp,
      {
        accounts: {
          owner: (<SolanaWallet>this.blockchain.wallet).wallet.publicKey,
          authority: this.authorityPda,
          fcd: fcdPda,
          systemProgram: SystemProgram.programId,
        },
      }
    );

    const confirmedTransaction = await (<SolanaProvider>(
      this.blockchain.getProvider()
    )).provider.connection.getTransaction(transactionSignature);

    return !confirmedTransaction.meta.err;
  }

  async resolveBlocksCountOffset(chainAddress: string): Promise<number> {
    await this.resolveContract();
    return this.blocksCountOffset();
  }

  async getBlockPda(chainAddress: string, blockId: number): Promise<PublicKey> {
    const [blockPda] = await derivePDAFromBlockId(blockId, new PublicKey(chainAddress));

    return blockPda;
  }
}
