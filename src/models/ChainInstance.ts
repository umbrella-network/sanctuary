import mongoose, { Schema, Document } from 'mongoose';

export interface IChainInstance extends Document {
  address: string;
  blocksCountOffset: number;
  anchor: number;
  chainId: string;
  version: number;
}

const ChainInstanceSchema: Schema = new Schema({
  _id: { type: String, required: true },
  address: { type: String, required: true },
  blocksCountOffset: { type: Number, required: true },
  anchor: { type: Number, required: true },
  chainId: { type: String, required: true },
  version: { type: Number, required: true },
});

ChainInstanceSchema.index({ blocksCountOffset: -1 });
ChainInstanceSchema.index({ anchor: -1 });
ChainInstanceSchema.index({ chainId: 1 });
ChainInstanceSchema.index({ address: 1, chainId: 1 }, { unique: true });

export default mongoose.model<IChainInstance>('ChainInstance', ChainInstanceSchema);
