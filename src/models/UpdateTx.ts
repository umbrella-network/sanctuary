import mongoose, { Schema } from 'mongoose';

export interface IUpdateTx {
  _id: string;
  txTimestamp: Date;
  chainId: string;
  feedsAddress: string;
  blockNumber: number;
  success: boolean;
  sender: string;
  signers: string[];
  fee: string;
  kees: string[];
}

const UpdateTx: Schema = new Schema({
  _id: { type: String, required: true }, // tx hash
  txTimestamp: { type: Date, required: true },
  chainId: { type: String, required: true, unique: false },
  feedsAddress: { type: String, required: true, unique: false },
  blockNumber: { type: Number, required: true },
  success: { type: Boolean, required: true, default: false },
  sender: { type: String, required: true },
  signers: { type: [String], required: true, default: [] },
  fee: { type: String, required: true },
  kees: { type: [String], required: true, default: [] },
});

UpdateTx.index({ blockNumber: -1 });
UpdateTx.index({ blockNumber: 1 });
UpdateTx.index({ chainId: 1 });
UpdateTx.index({ txTimestamp: 1 });

export default mongoose.model<IUpdateTx>('UpdateTx', UpdateTx);
