import { ChainStatus } from './ChainStatus';
import { ChainsIds } from './ChainsIds';

export type HexStringWith0x = string;

export type KeyValuePairs = Record<string, Buffer>;

export type ChainStatusExtended = {
  reverted: boolean;
  status: ChainStatus;
  chainId: ChainsIds;
};
