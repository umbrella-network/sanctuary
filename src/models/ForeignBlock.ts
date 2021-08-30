import mongoose, { Schema, Document } from 'mongoose';

export interface IForeignBlock extends Document {
  parentId: mongoose.Types.ObjectId;
  foreignChainId: string;
  anchor: number;
  createdAt: Date;
  updatedAt: Date;
  blockId: number;
}

const ForeignBlockSchema = new Schema({
  _id: { type: String, required: true },
  parentId: { type: mongoose.Types.ObjectId, required: true },
  anchor: { type: Number, required: true },
  foreignChainId: { type: String, required: true },
  blockId: { type: Number, required: true },
}, {
  timestamps: true
});

ForeignBlockSchema.index({ parentId: 1 });
ForeignBlockSchema.index({ blockId: 1, foreignChainId: 1 }, { unique: true });
export default mongoose.model<IForeignBlock>('ForeignBlock', ForeignBlockSchema);
