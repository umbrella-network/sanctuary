import { BigNumber } from 'ethers';

export interface Signature {
  v: number;
  r: string;
  s: string;
}

export interface FeedsPriceData {
  data: string;
  heartbeat: number;
  timestamp: number;
  price: bigint;
}

export type UpdateInput = [string[], [number, number, number, BigNumber][], [number, string, string][]];

export type UpdateData = {
  keys: string[];
  priceDatas: FeedsPriceData[];
  signatures: Signature[];
};
