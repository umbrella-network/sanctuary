import { Logger } from 'winston';
import { inject, injectable } from 'inversify';
import newrelic from 'newrelic';
import Block from '../models/Block';
import Migration from '../models/Migration';
import ChainInstance from '../models/ChainInstance';
import Leaf from '../models/Leaf';

@injectable()
class Migrations {
  @inject('Logger') private logger!: Logger;

  async apply(): Promise<void> {
    await this.migrateTo100();
    await this.migrateTo110();
    await this.migrateTo113();
  }

  private hasMigration = async (v: string): Promise<boolean> => {
    const migration = await Migration.find({ _id: v }).exec();
    return migration.length > 0;
  };

  private saveMigration = async (v: string): Promise<void> => {
    await new Migration({ _id: v, timestamp: new Date() }).save();
  };

  private wrapMigration = async (migrationId: string, callback: () => void) => {
    try {
      if (!(await this.hasMigration(migrationId))) {
        this.logger.info('Updating DB to match new schema', migrationId);
        await callback();
        await this.saveMigration(migrationId);
      }
    } catch (e) {
      newrelic.noticeError(e);
      this.logger.error(e);
    }
  };

  private migrateTo100 = async () => {
    await this.wrapMigration('1.0.0', async () => {
      const deletedChains = await ChainInstance.collection.deleteMany({ dataTimestamp: { $exists: true } });
      this.logger.info(`Deleted ${deletedChains.deletedCount} old chains instances`);

      const deletedBlocks = await Block.collection.deleteMany({ blockId: { $exists: false } });
      this.logger.info(`Deleted ${deletedBlocks.deletedCount} deprecated Blocks`);

      const deletedLeaves = await Leaf.collection.deleteMany({ blockId: { $exists: false } });
      this.logger.info(`Deleted ${deletedLeaves.deletedCount} deprecated Leaves`);

      const heightIndexes = ['height_-1', 'height_1'];

      heightIndexes.forEach(
        async (heightIndex): Promise<void> => {
          if (await Block.collection.indexExists(heightIndex)) {
            await Block.collection.dropIndex(heightIndex);
            this.logger.info(`${heightIndex} removed`);
          }
        }
      );
    });
  };

  private migrateTo110 = async () => {
    await this.wrapMigration('1.1.0', async () => {
      const deletedChains = await ChainInstance.collection.deleteMany({ anchor: { $exists: false } });
      this.logger.info(`Deleted ${deletedChains.deletedCount} old chains instances`);

      await Block.collection.drop();
      this.logger.info('Blocks dropped');

      await Leaf.collection.drop();
      this.logger.info('Leaves dropped');
    });
  };

  private migrateTo113 = async () => {
    await this.wrapMigration('1.1.3', async () => {
      this.logger.info('check');
    });
  };
}

export default Migrations;
