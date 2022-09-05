import { HexStringWith0x } from './custom';

export interface BlockFromPegasus {
  _id: string;
  timestamp: Date;
  mintedAt: Date;
  blockId: number;
  root: string;
  data: Record<string, HexStringWith0x>;
}

export interface FullBlockData {
  _id?: string;
  chainAddress: string;
  blockId: number;
  status: string;
  anchor: number;
  dataTimestamp: Date;
  root: string;
  minter: string;
  staked: string;
  power: string;
  voters: Array<string>;
  votes: Map<string, string>;
}

export enum BlockStatus {
  New = 'new',
  Completed = 'completed',
  Finalized = 'finalized',
  Failed = 'failed',
}

export interface IEventBlock {
  chainAddress: string;
  dataTimestamp: number;
  root: string;
  blockId: number;
  anchor: number;
  minter: string;
  staked: string;
  power: string;
  voters: string[];
  votes: Map<string, string>;
}
