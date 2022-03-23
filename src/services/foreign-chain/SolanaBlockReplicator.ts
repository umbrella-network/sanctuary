import { injectable } from 'inversify';
import { IBlock } from '../../models/Block';
import { GenericForeignBlockReplicator } from '.';
import { ChainsIds } from '../../types/ChainsIds';
import { ForeignChainStatus } from '../../types/ForeignChainStatus';
import { ReplicationStatus } from './ForeignBlockReplicator';
import { TransactionResult } from '../../contracts/generic/IGenericForeignChainContract';
import { TimeService } from '../TimeService';
import { FeedValue } from '@umb-network/toolbox/dist/types/Feed';
import { SolanaForeignChainContract } from '../../contracts/generic/SolanaForeignChainContract';

export const initializedFCDKeys = [
  'AAVE-USD',
  'BNB-USD',
  'BNT-USD',
  'BTC-USD',
  'COMP-USD',
  'DAI-USD',
  'ETH-USD',
  'FTS-USD',
  'GVol-BTC-IV-28days',
  'GVol-ETH-IV-28days',
  'LINK-USD',
  'MAHA-USD',
  'REN-USD',
  'SNX-USD',
  'UMB-USD',
  'UNI-USD',
  'YFI-USD',
];

@injectable()
export class SolanaBlockReplicator extends GenericForeignBlockReplicator {
  readonly chainId = ChainsIds.SOLANA;

  async postSetup(): Promise<void> {
    // nothing required for solana
    return;
  }

  async replicateGeneric(
    block: IBlock,
    keys: string[],
    values: FeedValue[],
    status: ForeignChainStatus
  ): Promise<ReplicationStatus> {
    this.logger.info(`[solana] Received a total of ${keys.length} FCDs to replicate`);

    this.logger.info(`[solana] FCD's received: ${keys.join(', ')}`);

    if (keys.length !== values.length) {
      this.logger.info('[solana] Number of FCD keys does not match number of FCD values');

      return;
    }

    const timestamp = TimeService.msToSec(block.dataTimestamp.getTime());

    const [useKeys, useValues] = await this.getFCDsToSubmit(keys, values, timestamp);

    const transactionResult: TransactionResult = await this.genericForeignChainContract.submit(
      timestamp,
      block.root,
      useKeys,
      useValues,
      block.blockId
    );

    if (!transactionResult) {
      return { errors: [`[${this.chainId}] Unable to send tx for blockId ${block.blockId} - no signature received`] };
    }

    if (transactionResult.status) {
      this.logger.info(
        `[${this.chainId}] block ${block.blockId} replicated with success at tx: ${transactionResult.transactionHash}`
      );
    } else {
      return { errors: [`[${this.chainId}] Unable to send tx for blockId ${block.blockId}`] };
    }

    if (transactionResult.status) {
      return {
        blocks: [block],
        fcds: [
          {
            keys: useKeys,
            values: useValues,
          },
        ],
        anchors: [transactionResult.blockNumber],
      };
    }
  }

  async getFCDsToSubmit(keys: string[], values: FeedValue[], dataTimestamp: number): Promise<[string[], FeedValue[]]> {
    this.logger.info('[solana] Checking keys for initialization');

    const useKeys = [];
    const useValues = [];

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];

      if (initializedFCDKeys.includes(key)) {
        useKeys.push(key);
        useValues.push(values[i]);
      } else {
        if (await this.isFCDInitialized(key)) {
          initializedFCDKeys.push(key);
          useKeys.push(key);
          useValues.push(values[i]);
        } else {
          this.logger.info(`[solana] Key not yet initialized: ${key}`);

          (<SolanaForeignChainContract>this.genericForeignChainContract)
            .initializeFCD(key, values[i], dataTimestamp)
            .then((success) => {
              if (success) {
                this.logger.info(`[solana] Key initialized: ${key}`);
              } else {
                this.logger.info(`[solana] Failed to initialize key: ${key}`);
              }
            });
        }
      }
    }

    this.logger.info(`[solana] Using FCDs: ${useKeys.join(', ')}`);

    return [useKeys, useValues];
  }

  async isFCDInitialized(key: string): Promise<boolean> {
    return (<SolanaForeignChainContract>this.genericForeignChainContract).isFCDInitialized(key);
  }
}
