import mongoose, { Schema, Document } from 'mongoose';

export interface IChainInstance extends Document {
  address: string;
  blocksCountOffset: number;
  anchor: number;
}

const ChainInstanceSchema: Schema = new Schema({
  _id: { type: String, required: true },
  address: { type: String, required: true, unique: true },
  blocksCountOffset: { type: Number, required: true },
  anchor: { type: Number, required: true },
});

ChainInstanceSchema.index({ blocksCountOffset: -1 });
ChainInstanceSchema.index({ anchor: -1 });

export default mongoose.model<IChainInstance>('ChainInstance', ChainInstanceSchema);
