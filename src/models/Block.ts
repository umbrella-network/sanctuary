import mongoose, { Schema, Document } from 'mongoose';

export interface IBlock extends Document {
  height: number,
  status: string,
  anchor: number,
  timestamp: Date,
  root: string,
  minter: string,
  staked: number,
  power: number,
  voters: Array<string>,
  votes: any
}

const BlockSchema: Schema = new Schema({
  _id: { type: String, required: true },
  height: { type: Number, required: true, unique: true },
  status: { type: String, required: false },
  anchor: { type: Number, required: false },
  timestamp: { type: Date, required: false },
  root: { type: String, required: false },
  minter: { type: String, required: false },
  staked: { type: Number, required: false, default: 0 },
  power: { type: Number, required: false, default: 0 },
  voters: { type: [String], required: false, default: [] },
  votes: { type: Map, required: false, default: {} }
});

BlockSchema.index({ height: -1 });
BlockSchema.index({ status: 1 });

export default mongoose.model<IBlock>('Block', BlockSchema);
