import mongoose, { Schema, Document } from 'mongoose';

export interface ICompany extends Document {
  name: string,
}

const CompanySchema: Schema = new Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true, unique: true }
});

CompanySchema.index({ name: 1 });

export default mongoose.model<ICompany>('Company', CompanySchema);
