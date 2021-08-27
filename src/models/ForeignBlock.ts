import mongoose, { Schema, Document } from 'mongoose';
import { number } from 'yargs';

export interface IForeignBlock extends Document {
  parentId: mongoose.Types.ObjectId;
  foreignChainId: string;
  anchor: number;
  createdAt: Date;
  updatedAt: Date;
}

const ForeignBlockSchema = new Schema({
  _id: { type: String, required: true },
  parentId: { type: mongoose.Types.ObjectId, required: true },
  anchor: { type: Number, required: true },
  foreignChainId: { type: String, required: true }
}, {
  timestamps: true
})

ForeignBlockSchema.index({ parentId: 1 });

export default mongoose.model<IForeignBlock>('ForeignBlock', ForeignBlockSchema);
