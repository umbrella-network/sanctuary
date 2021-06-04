import mongoose, { Schema, Document } from 'mongoose';

export interface IMigration extends Document {
  _id: string;
  timestamp: Date;
}

const MigrationSchema: Schema = new Schema({
  _id: { type: String, required: true },
  timestamp: { type: Date, required: true },
});

export default mongoose.model<IMigration>('Migration', MigrationSchema);
