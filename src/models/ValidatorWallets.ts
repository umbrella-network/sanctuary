import mongoose, { Schema, Document } from 'mongoose';

export interface IValidatorWallets extends Document {
  signer: string;
  deviation: string;
  chainId: string;
}

const ValidatorWalletsSchema: Schema = new Schema({
  _id: { type: String, required: true },
  signer: { type: String, required: true },
  deviation: { type: String, required: true },
  chainId: { type: String, required: true },
});

export default mongoose.model<IValidatorWallets>('ValidatorWallets', ValidatorWalletsSchema);
