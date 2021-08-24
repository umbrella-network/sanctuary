import mongoose, { Schema, Document } from 'mongoose';

export interface IForeignBlock extends Document {
  status: string;
  parentId: string;
  blockchainId: string;
  createdAt: Date;
}

const ForeignBlockSchema = new Schema({
  _id: { type: String, required: true },
  parentId: { type: String, required: true },
  blockchainId: { type: String, required: true },
  blockHeight: { type: String },
  status: { type: String, required: true },
  timestamp: { type: Date, required: true },
}, {
  timestamps: true
})

ForeignBlockSchema.index({ parentId: 1 });
ForeignBlockSchema.index({ status: 1 });

export default mongoose.model<IForeignBlock>('ForeignBlock', ForeignBlockSchema);
