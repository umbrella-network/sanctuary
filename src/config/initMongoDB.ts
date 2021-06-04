import Settings from '../types/Settings';
import mongoose from 'mongoose';
import Block from '../models/Block';
import Leaf from '../models/Leaf';
import ChainInstance from '../models/ChainInstance';
import Migration from '../models/Migration';

const hasMigration = async (v: string): Promise<boolean> => {
  const migration = await Migration.find({ _id: v }).exec();
  return migration.length > 0;
};

const saveMigration = async (v: string): Promise<void> => {
  await new Migration({ _id: v, timestamp: new Date() }).save();
};

const wrapMigration = async (migrationId: string, callback: () => void) => {
  try {
    if (!(await hasMigration(migrationId))) {
      console.log('Updating DB to match new schema', migrationId);
      await callback();
      await saveMigration(migrationId);
    }
  } catch (e) {
    console.error(e);
  }
};

const migrateTo100 = async () => {
  await wrapMigration('1.0.0', async () => {
    const deletedChains = await ChainInstance.collection.deleteMany({ dataTimestamp: { $exists: true } });
    console.log(`Deleted ${deletedChains.deletedCount} old chains instances`);

    const deletedBlocks = await Block.collection.deleteMany({ blockId: { $exists: false } });
    console.log(`Deleted ${deletedBlocks.deletedCount} deprecated Blocks`);

    const deletedLeaves = await Leaf.collection.deleteMany({ blockId: { $exists: false } });
    console.log(`Deleted ${deletedLeaves.deletedCount} deprecated Leaves`);

    const heightIndexes = ['height_-1', 'height_1'];

    heightIndexes.forEach(
      async (heightIndex): Promise<void> => {
        if (await Block.collection.indexExists(heightIndex)) {
          await Block.collection.dropIndex(heightIndex);
          console.log(`${heightIndex} removed`);
        }
      }
    );
  });
};

const migrateTo110 = async () => {
  await wrapMigration('1.1.0', async () => {
    const deletedChains = await ChainInstance.collection.deleteMany({ anchor: { $exists: false } });
    console.log(`Deleted ${deletedChains.deletedCount} old chains instances`);

    await Block.collection.drop();
    console.log('Blocks dropped');

    await Leaf.collection.drop();
    console.log('Leaves dropped');
  });
};

export default async function initMongoDB(settings: Settings): Promise<void> {
  mongoose.set('useFindAndModify', false);
  await mongoose.connect(settings.mongodb.url, { useNewUrlParser: true, useUnifiedTopology: true });

  await migrateTo100();
  await migrateTo110();
}
