export enum ChainsIds {
  ARBITRUM = 'arbitrum',
  AVALANCHE = 'avax',
  BSC = 'bsc',
  ETH = 'ethereum',
  POLYGON = 'polygon',
}

export type TForeignChainsIds = ChainsIds.ARBITRUM | ChainsIds.AVALANCHE | ChainsIds.ETH | ChainsIds.POLYGON;

export const ForeignChainsIds: TForeignChainsIds[] = [
  ChainsIds.ARBITRUM,
  ChainsIds.AVALANCHE,
  ChainsIds.ETH,
  ChainsIds.POLYGON,
];
