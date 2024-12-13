export enum ChainsIds {
  ARBITRUM = 'arbitrum',
  AVALANCHE = 'avax',
  BSC = 'bsc',
  ETH = 'ethereum',
  POLYGON = 'polygon',
  SOLANA = 'solana',
  BASE = 'base',
  LINEA = 'linea',
  ROOTSTOCK = 'rootstock',
  _5IRE = '_5ire',
}

export type TForeignChainsIds =
  | ChainsIds.ARBITRUM
  | ChainsIds.AVALANCHE
  | ChainsIds.ETH
  | ChainsIds.POLYGON
  | ChainsIds.SOLANA;

export const ForeignChainsIds: TForeignChainsIds[] = [
  ChainsIds.ARBITRUM,
  ChainsIds.AVALANCHE,
  ChainsIds.ETH,
  ChainsIds.POLYGON,
  ChainsIds.SOLANA,
];

export const NonEvmChainsIds: ChainsIds[] = [ChainsIds.SOLANA];
