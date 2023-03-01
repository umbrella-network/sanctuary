import mongoose, { Schema, Document } from 'mongoose';

export interface IMapping extends Document {
  _id: string;
  value: string;
}

const MappingSchema: Schema = new Schema({
  _id: { type: String, required: true },
  value: { type: String, required: true, unique: false },
});

export default mongoose.model<IMapping>('Mapping', MappingSchema);
