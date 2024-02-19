import mongoose, { Schema, Document } from 'mongoose';

export interface IPriceData extends Document {
  tx: string;
  chainId: string;
  key: string;
  value: string;
  heartbeat: number;
  timestamp: number;
  data: string;
}

export interface IPriceDataRaw {
  tx: string;
  chainId: string;
  key: string;
  value: bigint;
  heartbeat: number;
  timestamp: number;
  data: string;
}

const PriceData: Schema = new Schema({
  _id: { type: String, required: true },
  tx: { type: String, required: true },
  chainId: { type: String, required: true },
  key: { type: String, required: true },
  value: { type: String, required: true },
  heartbeat: { type: Number, required: true },
  timestamp: { type: Number, required: true },
  data: { type: String },
});

PriceData.index({ tx: 1 });
PriceData.index({ timestamp: 1 });
PriceData.index({ timestamp: -1 });
PriceData.index({ chainId: 1 });
PriceData.index({ key: 1 });

export default mongoose.model<IPriceData>('PriceData', PriceData);
