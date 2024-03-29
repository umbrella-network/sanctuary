import mongoose, { Schema, Document } from 'mongoose';

export interface IProject extends Document {
  name: string;
  ownerId: string;
  ownerType: string;
}

const ProjectSchema: Schema = new Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  ownerId: { type: String, required: true },
  ownerType: { type: String, required: true, enum: ['User', 'Company'] },
});

ProjectSchema.index({ name: 1 });

export default mongoose.model<IProject>('Project', ProjectSchema);
