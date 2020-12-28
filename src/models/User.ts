import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
}

const UserSchema: Schema = new Schema({
  _id: { type: String, required: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    validate: {
      validator: (email: string) => {
        return /^([\w-\.]+@([\w-]+\.)+[\w-]{2,7})?$/.test(email);
      },
    },
  },
  password: { type: String, required: true },
  verified: { type: Boolean, required: true, default: false },
});

UserSchema.index({ email: 1 }, { unique: true });

UserSchema.post('save', (user) => {
  // Send verification request
});

export default mongoose.model<IUser>('User', UserSchema);