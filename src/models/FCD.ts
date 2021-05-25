import mongoose, { Schema, Document } from 'mongoose';

export interface IFCD extends Document {
  value: number;
  dataTimestamp: Date;
  chainAddress: string;
}

const FCDSchema: Schema = new Schema({
  _id: { type: String, required: true },
  chainAddress: { type: String, required: true, unique: false },
  value: { type: Number, required: true },
  dataTimestamp: { type: Date, required: true },
});

FCDSchema.index({ dataTimestamp: -1 });

export default mongoose.model<IFCD>('FCD', FCDSchema);
