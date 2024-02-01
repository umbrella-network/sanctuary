export const LAST_BLOCK_CHECKED_FOR_NEW_CHAIN = (chainId: string | number): string =>
  `LAST_BLOCK_CHECKED_FOR_NEW_CHAIN__${chainId}`;

export const LAST_BLOCK_CHECKED_FOR_NEW_CONTRACT = (chainId: string | number): string =>
  `LAST_BLOCK_CHECKED_FOR_NEW_CONTRACT__${chainId}`;

export const LAST_BLOCK_CHECKED_FOR_MINT_EVENT = (chainId: string | number): string =>
  `LAST_BLOCK_CHECKED_FOR_MINT_EVENT__${chainId}`;
