import mongoose, { Schema, Document } from 'mongoose';

export type SynchronizationState = {
  synchronizedAt: Date;
  chains: {
    [key: string]: string;
  };
};

export interface IBlock extends Document {
  blockId: number;
  status: string;
  dataTimestamp: Date;
  root: string;
  staked: string;
  power: string;
  voters: Array<string>;
  votes: Map<string, string>;
  synchronization?: SynchronizationState;
}

const BlockSchema: Schema = new Schema({
  _id: { type: String, required: true },
  blockId: { type: Number, required: true, unique: true },
  status: { type: String, required: false },
  dataTimestamp: { type: Date, required: true },
  root: { type: String, required: true },
  staked: { type: String, required: true },
  power: { type: String, required: true },
  voters: { type: [String], required: false, default: [] },
  votes: { type: Map, required: false, default: {} },
  synchronization: { type: Map, required: false },
});

BlockSchema.index({ blockId: -1 });
BlockSchema.index({ blockId: 1 });
BlockSchema.index({ status: 1 });
BlockSchema.index({ dataTimestamp: 1 });
BlockSchema.index({ 'synchronization.synchronizedAt': -1 });

export default mongoose.model<IBlock>('Block', BlockSchema);
