import Settings from '../types/Settings';
import mongoose from 'mongoose';

export default async function initMongoDB(settings: Settings): Promise<void> {
  await mongoose.connect(
    settings.mongodb.url,
    {
      useNewUrlParser: true,
      useFindAndModify: false,
      useUnifiedTopology: true,
      useCreateIndex: true
    });
}
