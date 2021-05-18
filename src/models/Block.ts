import mongoose, { Schema, Document } from 'mongoose';

export interface IBlock extends Document {
  chainAddress: string;
  blockId: number;
  status: string;
  anchor: string;
  dataTimestamp: Date;
  root: string;
  minter: string;
  staked: string;
  power: string;
  voters: Array<string>;
  votes: Map<string, string>;
}

const BlockSchema: Schema = new Schema({
  _id: { type: String, required: true },
  chainAddress: { type: String, required: true, unique: false },
  blockId: { type: Number, required: true, unique: true },
  status: { type: String, required: false },
  anchor: { type: String, required: false },
  dataTimestamp: { type: Date, required: false },
  root: { type: String, required: false },
  minter: { type: String, required: false },
  staked: { type: String, required: false, default: 0 },
  power: { type: String, required: false, default: 0 },
  voters: { type: [String], required: false, default: [] },
  votes: { type: Map, required: false, default: {} },
});

BlockSchema.index({ blockId: -1 });
BlockSchema.index({ status: 1 });

export default mongoose.model<IBlock>('Block', BlockSchema);
