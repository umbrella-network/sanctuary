import mongoose, { Schema, Document } from 'mongoose';

export interface IValidator extends Document {
  address: string;
  location: string;
  power: string;
}

const ValidatorSchema: Schema = new Schema({
  _id: { type: String, required: true },
  address: { type: String, required: true, unique: true },
  location: { type: String, required: true, unique: true },
  power: { type: String, required: true, unique: false },
  updatedAt: { type: Date, required: true },
});

export default mongoose.model<IValidator>('CachedValidator', ValidatorSchema);
