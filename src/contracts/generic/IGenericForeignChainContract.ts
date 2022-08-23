import Settings from '../../types/Settings';
import { IGenericBlockchain } from '../../lib/blockchains/IGenericBlockchain';
import { ChainBlockData, ChainFCDsData } from '../../models/ChainBlockData';
import { ForeignChainStatus } from '../../types/ForeignChainStatus';
import { FeedValue } from '@umb-network/toolbox/dist/types/Feed';

export type TransactionResult = {
  transactionHash: string;
  status: boolean;
  blockNumber: number;
};

export type GenericForeignChainContractProps = {
  blockchain: IGenericBlockchain;
  settings: Settings;
};

export interface IGenericForeignChainContract {
  readonly settings: Settings;
  readonly blockchain: IGenericBlockchain;

  submit(
    dataTimestamp: number,
    root: string,
    keys: string[],
    values: FeedValue[],
    blockId: number
  ): Promise<TransactionResult>;

  resolveContract(): void;
  resolveStatus(): Promise<ForeignChainStatus>;
  blocksCountOffset(): Promise<number>;
  resolveBlockData(chainAddress: string, blockId: number): Promise<ChainBlockData>;
  resolveFCDs(chainAddress: string, keys: string[]): Promise<ChainFCDsData>;
  resolveBlocksCountOffset(chainAddress: string): Promise<number>;
  address(): string;
}
