import mongoose, { Schema, Document } from 'mongoose';

export interface IForeignBlock extends Document {
  foreignChainId: string;
  chainAddress: string;
  anchor: number;
  createdAt: Date;
  updatedAt: Date;
  blockId: number;
}

const ForeignBlockSchema = new Schema(
  {
    _id: { type: String, required: true },
    anchor: { type: Number, required: true },
    foreignChainId: { type: String, required: true },
    chainAddress: { type: String, required: true, unique: false },
    blockId: { type: Number, required: true },
  },
  {
    timestamps: true,
  }
);

ForeignBlockSchema.index({ blockId: 1, foreignChainId: 1 }, { unique: true });
export default mongoose.model<IForeignBlock>('ForeignBlock', ForeignBlockSchema);
