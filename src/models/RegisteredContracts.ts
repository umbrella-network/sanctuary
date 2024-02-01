import mongoose, { Schema, Document } from 'mongoose';

export interface IRegisteredContracts extends Document {
  address: string;
  anchor: number;
  chainId: string;
}

const RegisteredContractsSchema: Schema = new Schema({
  _id: { type: String, required: true },
  address: { type: String, required: true },
  anchor: { type: Number, required: true },
  chainId: { type: String, required: true },
});

RegisteredContractsSchema.index({ anchor: -1 });
RegisteredContractsSchema.index({ anchor: 1 });
RegisteredContractsSchema.index({ chainId: 1 });
RegisteredContractsSchema.index({ address: 1, chainId: 1 }, { unique: true });

export default mongoose.model<IRegisteredContracts>('RegisteredContracts', RegisteredContractsSchema);
