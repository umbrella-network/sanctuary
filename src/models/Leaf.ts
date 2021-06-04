import mongoose, { Schema, Document } from 'mongoose';
import { HexStringWith0x } from '../types/custom';

export interface ILeaf extends Document {
  blockId: number;
  key: string;
  value: HexStringWith0x;
  proof: string[];
}

const LeafSchema: Schema = new Schema(
  {
    _id: { type: String, required: true },
    blockId: { type: Number, required: true },
    key: { type: String, required: true },
    value: { type: String, required: true },
    proof: { type: [String], required: true },
  },
  { _id: false }
);

LeafSchema.index({ blockId: 1, key: 1 });

export default mongoose.model<ILeaf>('Leaf', LeafSchema);
