import mongoose, { Schema, Document } from 'mongoose';

export interface IWalletAuth extends Document {
  message: string;
  address: string;
  verified: boolean;
}

const WalletAuthSchema: Schema = new Schema({
  _id: { type: String, required: true },
  message: { type: String, required: true },
  address: { type: String, required: false },
  verified: { type: Boolean, required: true, default: false },
});

WalletAuthSchema.index({ address: 1 });
WalletAuthSchema.index({ message: 1 }, { unique: true });

export default mongoose.model<IWalletAuth>('WalletAuthSchema', WalletAuthSchema);
