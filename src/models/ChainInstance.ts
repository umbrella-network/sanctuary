import mongoose, { Schema, Document } from 'mongoose';

export interface IChainInstance extends Document {
  address: string;
  blocksCountOffset: number;
  dataTimestamp: Date;
}

const ChainInstanceSchema: Schema = new Schema({
  _id: { type: String, required: true },
  address: { type: String, required: true, unique: true },
  blocksCountOffset: { type: Number, required: true },
  dataTimestamp: { type: Date, required: true },
});

ChainInstanceSchema.index({ blocksCountOffset: -1 });

export default mongoose.model<IChainInstance>('ChainInstance', ChainInstanceSchema);
