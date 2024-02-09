import mongoose, { Schema, Document } from 'mongoose';

export interface IFeedKey extends Document {
  key: string;
}

const FeedKey: Schema = new Schema({
  _id: { type: String, required: true },
  key: { type: String, required: true },
});

export default mongoose.model<IFeedKey>('FeedKey', FeedKey);
