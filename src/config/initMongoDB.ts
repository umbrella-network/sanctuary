import Settings from '../types/Settings';
import mongoose from 'mongoose';

export default async function initMongoDB(settings: Settings): Promise<void> {
  mongoose.set('useNewUrlParser', true);
  mongoose.set('useFindAndModify', false);
  mongoose.set('useCreateIndex', true);
  await mongoose.connect(settings.mongodb.url, { useNewUrlParser: true, useUnifiedTopology: true });
}
