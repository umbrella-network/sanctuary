import mongoose, { Schema, Document } from 'mongoose';

export interface IForeignBlock extends Document {
}

const ForeignBlockSchema = new Schema({
  _id: { type: String, required: true },
  parentId: { type: String, required: true },
}, {
  timestamps: true
})

ForeignBlockSchema.index({ parentId: 1 });

export default mongoose.model<IForeignBlock>('ForeignBlock', ForeignBlockSchema);
