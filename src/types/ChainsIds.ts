export enum ChainsIds {
  AVALANCHE = 'avax',
  BSC = 'bsc',
  ETH = 'ethereum',
  POLYGON = 'polygon',
}

export type TForeignChainsIds = ChainsIds.AVALANCHE | ChainsIds.ETH | ChainsIds.POLYGON;

export const ForeignChainsIds: TForeignChainsIds[] = [ChainsIds.AVALANCHE, ChainsIds.ETH, ChainsIds.POLYGON];
