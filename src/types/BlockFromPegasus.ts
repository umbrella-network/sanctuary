export interface BlockFromPegasus {
  _id: string;
  timestamp: Date;
  mintedAt: Date;
  height: number;
  root: string;
  data: Record<string, string>;
  numericFcdKeys: Array<string>;
}
