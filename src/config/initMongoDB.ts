import Settings from '../types/Settings';
import mongoose from 'mongoose';
import Block from '../models/Block';
import Leaf from '../models/Leaf';

const updateDB = async (): Promise<void> => {
  try {
    console.log('Updating DB to match new schema');
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
  } catch (e) {
    console.error(e);
  }
};

export default async function initMongoDB(settings: Settings): Promise<void> {
  mongoose.set('useFindAndModify', false);
  await mongoose.connect(settings.mongodb.url, { useNewUrlParser: true, useUnifiedTopology: true });

  await updateDB();
}
