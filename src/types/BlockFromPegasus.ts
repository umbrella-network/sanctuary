import { HexStringWith0x } from './custom';

export interface BlockFromPegasus {
  _id: string;
  timestamp: Date;
  mintedAt: Date;
  blockId: number;
  root: string;
  data: Record<string, HexStringWith0x>;
  fcdKeys: Array<string>;
  fcdValues: Array<number>;
  anchor: string;
  votes: Record<string, string>;
  power: string;
  staked: string;
  minter: string;
}
