import { ChainStatus } from './ChainStatus';
import { ChainsIds } from './ChainsIds';

export type HexStringWith0x = string;

export type KeyValuePairs = Record<string, Buffer>;

export type ChainStatusExtended = {
  reverted: boolean;
  status: ChainStatus;
  chainId: ChainsIds;
};

export const SETTLED_FULFILLED = 'fulfilled';
export const SETTLED_REJECTED = 'rejected';

export type PromiseResultStatus = typeof SETTLED_FULFILLED | typeof SETTLED_REJECTED;
