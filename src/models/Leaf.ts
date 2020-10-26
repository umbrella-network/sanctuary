import mongoose, { Schema, Document } from 'mongoose';

export interface ILeaf extends Document {
  blockId: string,
  key: string,
  value: string
}

const Leafchema: Schema = new Schema({
  _id: { type: String, required: true },
  blockId: { type: String, required: true },
  key: { type: String, required: true },
  value: { type: String, required: true }
}, { _id: false });

export default mongoose.model<ILeaf>('Leaf', Leafchema);
