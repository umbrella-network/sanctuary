import mongoose, { Schema, Document } from 'mongoose';

export interface IForeignBlock extends Document {
  foreignChainId: string;
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
    blockId: { type: Number, required: true },
  },
  {
    timestamps: true,
  }
);

ForeignBlockSchema.index({ blockId: 1, foreignChainId: 1 }, { unique: true });
export default mongoose.model<IForeignBlock>('ForeignBlock', ForeignBlockSchema);
