import mongoose, { Schema, Document } from 'mongoose';

export interface ILocalUser extends Document {
  email: string;
  password: string;
  verified: boolean;
}

const LocalUserSchema: Schema = new Schema({
  _id: { type: String, required: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    validate: {
      validator: (email: string) => {
        return /^([\w-.]+@([\w-]+\.)+[\w-]{2,7})?$/.test(email);
      },
    },
  },
  password: { type: String, required: true },
  verified: { type: Boolean, required: true, default: false },
});

LocalUserSchema.index({ email: 1 }, { unique: true });

export default mongoose.model<ILocalUser>('User', LocalUserSchema);
