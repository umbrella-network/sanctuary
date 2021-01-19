import { HexStringWith0x } from './HexStringWith0x';

export interface BlockFromPegasus {
  _id: string;
  timestamp: Date;
  mintedAt: Date;
  height: number;
  root: string;
  data: Record<string, HexStringWith0x>;
  numericFcdKeys: Array<string>;
}
