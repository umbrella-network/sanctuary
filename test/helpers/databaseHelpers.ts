import initMongoDB from '../../src/config/initMongoDB';
import mongoose from 'mongoose';

export async function setupDatabase(): Promise<void> {
  const { default: settings } = await require('../../src/config/settings');
  await initMongoDB(settings);
}

export async function teardownDatabase(): Promise<void> {
  await mongoose.connection.close();
}
