export type NetworkStatus = {
  name: string;
  id: number;
};

export interface NetworkStatusWithBlock extends NetworkStatus {
  blockNumber: number;
}
