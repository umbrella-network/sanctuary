import newrelic from 'newrelic';
import Block from '../models/Block';
import Migration from '../models/Migration';
import ChainInstance from '../models/ChainInstance';
import Leaf from '../models/Leaf';
import FCD from '../models/FCD';

class Migrations {
  static async apply(): Promise<void> {
    // await this.migrateTo100();
    // await this.migrateTo110();
    await Migrations.migrateTo121();
    await Migrations.migrateTo400();
    await Migrations.migrateTo400_2();
  }

  private static hasMigration = async (v: string): Promise<boolean> => {
    const migration = await Migration.find({ _id: v }).exec();
    return migration.length > 0;
  };

  private static saveMigration = async (v: string): Promise<void> => {
    await new Migration({ _id: v, timestamp: new Date() }).save();
  };

  private static wrapMigration = async (migrationId: string, callback: () => void) => {
    try {
      if (!(await Migrations.hasMigration(migrationId))) {
        console.log('Updating DB to match new schema', migrationId);
        await callback();
        await Migrations.saveMigration(migrationId);
      }
    } catch (e) {
      newrelic.noticeError(e);
      console.error(e);
    }
  };

  private static migrateTo100 = async () => {
    await Migrations.wrapMigration('1.0.0', async () => {
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

  private static migrateTo110 = async () => {
    await Migrations.wrapMigration('1.1.0', async () => {
      const deletedChains = await ChainInstance.collection.deleteMany({ anchor: { $exists: false } });
      console.log(`Deleted ${deletedChains.deletedCount} old chains instances`);

      await Block.collection.drop();
      console.log('Blocks dropped');

      await Leaf.collection.drop();
      console.log('Leaves dropped');
    });
  };

  private static migrateTo121 = async () => {
    await Migrations.wrapMigration('1.2.1', async () => {
      const deleted = await FCD.collection.deleteMany({ dataTimestamp: { $eq: new Date(0) } });
      console.log(`Deleted ${deleted.deletedCount} old chains instances`);
    });
  };

  private static migrateTo400 = async () => {
    await Migrations.wrapMigration('4.0.0', async () => {
      const address_1 = 'address_1';

      if (await ChainInstance.collection.indexExists(address_1)) {
        await ChainInstance.collection.dropIndex(address_1);
        console.log(`${address_1} removed`);
      }

      const chains = await ChainInstance.find({chainId: { $exists: false }});

      await Promise.all(
        chains.map((chain) => {
          chain.chainId = 'bsc';
          return chain.save();
        })
      );
    });
  };

  private static migrateTo400_2 = async () => {
    await Migrations.wrapMigration('4.0.0_2', async () => {
      const dataTimestamp1 = 'dataTimestamp_1';

      if (await FCD.collection.indexExists(dataTimestamp1)) {
        await FCD.collection.dropIndex(dataTimestamp1);
        console.log(`${dataTimestamp1} removed`);
      }

      const fcds = await FCD.find({chainId: { $exists: false }});

      await Promise.all(
        fcds.map((fcd) => {
          const newFcd = new FCD();
          newFcd.chainId = 'bsc';
          newFcd.key = fcd._id;
          newFcd.id = `bsc::${fcd.key}`;
          return newFcd.save();
        })
      );

      await FCD.deleteMany({chainId: { $exists: false }});
    });
  };
}

export default Migrations;
