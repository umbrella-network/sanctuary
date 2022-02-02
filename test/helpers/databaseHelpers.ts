import initMongoDB from '../../src/config/initMongoDB';
import mongoose from 'mongoose';

export async function setupDatabase(): Promise<void> {
  const { default: settings } = await require('../../src/config/settings');

  if (process.env.NODE_ENV === 'testing') {
    settings.mongodb.url = 'mongodb://localhost:27017/sanctuary-test';
  }

  await initMongoDB(settings);
}

export async function teardownDatabase(): Promise<void> {
  await mongoose.connection.close();
}
