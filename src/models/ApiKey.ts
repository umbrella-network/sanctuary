import mongoose, { Schema, Document } from 'mongoose';

export interface IApiKey extends Document {
  projectId: string;
  description?: string;
  expiresAt?: Date;
  key: string;
}

const ApiKeySchema: Schema = new Schema({
  _id: { type: String, required: true },
  createdAt: { type: Date, default: () => new Date() },
  projectId: { type: String, required: true },
  description: { type: String, required: false },
  expiresAt: { type: Date, required: false },
  key: { type: String, required: true },
});

ApiKeySchema.index({ key: 1 });

export default mongoose.model<IApiKey>('ApiKey', ApiKeySchema);
