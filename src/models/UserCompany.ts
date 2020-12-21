import mongoose, { Schema, Document } from 'mongoose';

export interface IUserCompany extends Document {
  userId: string,
  companyId: string,
}

const UserCompanySchema: Schema = new Schema({
  _id: { type: String, required: true },
  userId: { type: Number, required: true },
  companyId: { type: Number, required: true }
});

UserCompanySchema.index({ userId: 1, companyId: 1 });

export default mongoose.model<IUserCompany>('UserCompany', UserCompanySchema);
