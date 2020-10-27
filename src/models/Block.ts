import mongoose, { Schema, Document } from 'mongoose';

export interface IBlock extends Document {
  height: number,
  status: string,
  anchor: number,
  timestamp: date,
  root: string,
  minter: string,
  staked: number,
  power: number,
  voters: Array<string>
}

const BlockSchema: Schema = new Schema({
  _id: { type: String, required: true },
  height: { type: Number, required: true, unique: true },
  status: { type: String, required: true },
  anchor: { type: Number, required: true },
  timestamp: { type: Date, required: true },
  root: { type: String, required: true },
  minter: { type: String, required: true },
  staked: { type: Number, required: true },
  power: { type: Number, required: true },
  voters: { type: [String], required: true }
});

export default mongoose.model<IBlock>('Block', BlockSchema);
