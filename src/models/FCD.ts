import mongoose, { Schema, Document } from 'mongoose';

export interface IFCD extends Document {
  key: string;
  value: number | string;
  dataTimestamp: Date;
  chainId: string;
}

const FCDSchema: Schema = new Schema({
  _id: { type: String, required: true },
  key: { type: String, required: true },
  value: { type: String, required: true },
  chainId: { type: String, required: true, unique: false },
  dataTimestamp: { type: Date, required: true },
});

FCDSchema.index({ dataTimestamp: -1, chainId: 1 });

export default mongoose.model<IFCD>('FCD', FCDSchema);
