import { HexStringWith0x } from './HexStringWith0x';

export interface BlockFromPegasus {
  _id: string;
  timestamp: Date;
  mintedAt: Date;
  blockId: number;
  root: string;
  data: Record<string, HexStringWith0x>;
  numericFcdKeys: Array<string>;
  numericFcdValues: Array<number>;
  anchor: string;
  votes: Record<string, string>;
  power: string;
  staked: string;
  minter: string;
}
