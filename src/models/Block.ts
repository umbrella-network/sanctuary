import mongoose, { Schema, Document } from 'mongoose';

export interface IBlock extends Document {
  chainAddress: string;
  height: number;
  status: string;
  anchor: string;
  timestamp: Date;
  root: string;
  minter: string;
  staked: string;
  power: string;
  voters: Array<string>;
  votes: Map<string, string>;
  numericFcdKeys: Array<string>;
  numericFcdValues: Array<number>;
}

const BlockSchema: Schema = new Schema({
  _id: { type: String, required: true },
  chainAddress: { type: String, required: true, unique: false },
  height: { type: Number, required: true, unique: true },
  status: { type: String, required: false },
  anchor: { type: String, required: false },
  timestamp: { type: Date, required: false },
  root: { type: String, required: false },
  minter: { type: String, required: false },
  staked: { type: String, required: false, default: 0 },
  power: { type: String, required: false, default: 0 },
  voters: { type: [String], required: false, default: [] },
  votes: { type: Map, required: false, default: {} },
  numericFcdKeys: { type: [String], required: false, default: [] },
  numericFcdValues: { type: [Number], required: false, default: [] },
});

BlockSchema.index({ height: -1 });
BlockSchema.index({ status: 1 });

export default mongoose.model<IBlock>('Block', BlockSchema);
