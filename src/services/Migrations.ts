import newrelic from 'newrelic';
import Block from '../models/Block';
import Migration from '../models/Migration';
import ChainInstance from '../models/ChainInstance';
import Leaf from '../models/Leaf';
import FCD from '../models/FCD';
import BlockChainData, { IBlockChainData } from '../models/BlockChainData';
import mongoose, { Model } from 'mongoose';
import { sleep } from '../utils/sleep';
import ForeignBlock, { IForeignBlock } from '../models/ForeignBlock';

class Migrations {
  static async apply(): Promise<void> {
    // await this.migrateTo100();
    // await this.migrateTo110();
    // await Migrations.migrateTo121();
    // await Migrations.migrateTo400();
    // await Migrations.migrateTo400_3();
    // await Migrations.migrateTo401();
    await Migrations.migrateTo600();
  }

  private static hasMigration = async (v: string): Promise<boolean> => {
    const migration = await Migration.find({ _id: v }).exec();
    return migration.length > 0;
  };

  private static saveMigration = async (v: string): Promise<void> => {
    await new Migration({ _id: v, timestamp: new Date() }).save();
  };

  private static wrapMigration = async (
    migrationId: string,
    callback: () => void,
    callbackError?: (err: unknown) => void
  ) => {
    try {
      if (!(await Migrations.hasMigration(migrationId))) {
        console.log('[Migrations] Updating DB to match new schema', migrationId);
        await callback();
        await Migrations.saveMigration(migrationId);
      }
    } catch (e) {
      newrelic.noticeError(e);
      console.error(e);

      if (callbackError) {
        callbackError(e);
      }
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

      const chains = await ChainInstance.find({ chainId: { $exists: false } });

      await Promise.all(
        chains.map((chain) => {
          chain.chainId = 'bsc';
          return chain.save();
        })
      );
    });
  };

  private static migrateTo400_3 = async () => {
    await Migrations.wrapMigration('4.0.0_3', async () => {
      const indexesToRemove = ['dataTimestamp_-1', 'chainAddress_1'];

      for (const indexToRemove of indexesToRemove) {
        if (await FCD.collection.indexExists(indexToRemove)) {
          await FCD.collection.dropIndex(indexToRemove);
          console.log(`index ${indexToRemove} removed`);
        }
      }

      const fcds = await FCD.find({ chainId: { $exists: false } });

      await Promise.all(
        fcds.map((fcd) => {
          const newFcd = new FCD();
          newFcd.chainId = 'bsc';
          newFcd.key = fcd._id;
          newFcd.value = fcd.value;
          newFcd.dataTimestamp = fcd.dataTimestamp;
          newFcd._id = `bsc::${newFcd.key}`;
          return newFcd.save();
        })
      );

      await FCD.deleteMany({ chainId: { $exists: false } });
      await FCD.deleteMany({ id: { $exists: false } });
    });
  };

  private static migrateTo401 = async () => {
    await Migrations.wrapMigration('4.0.1', async () => {
      const foreignBlocks = await BlockChainData.find({ minter: { $exists: false } });

      await Promise.all(
        foreignBlocks.map((foreignBlock) => {
          foreignBlock.minter = '0x57a2022Fa04F38207Ab3CD280557CAD6d0b77BE1';
          return foreignBlock.save();
        })
      );
    });
  };

  /**
   * 1. Delete blockchaindatas since it is created automatically
   * 2. Rename foreignblocks collection to blockchaindatas
   * 3. Insert all blocks from blocks collection
   *   into blockchaindatas collection setting foreignchainId='bsc'
   */
  private static migrateTo600 = async () => {
    await sleep(15000); // this is necessary to blockchaindatas collection be created
    const version = '6.0.0';
    const startTime = new Date().getTime();
    const indexesToRemove = ['blockId_1_foreignChainId_1', 'chainAddress_1', 'minter_1'];
    const indexesToCreate = [{ blockId: -1 }, { anchor: -1 }];

    await Migrations.wrapMigration(version, async () => {
      const session = await mongoose.startSession();
      try {
        console.log(`[Migrations(${version})] Starting migration - ${startTime}`);
        const db = mongoose.connection.db;
        const blockChainDataCount = await BlockChainData.countDocuments({});
        console.log(`[Migrations(${version})] blockChainDataCount ${blockChainDataCount}`);
        if (blockChainDataCount > 0) {
          throw new Error(`[Migrations(${version})] BlockChainData already have data`);
        }
        await db.dropCollection('blockchaindatas');
        console.log(`[Migrations(${version})] Dropped collection`);
        await Migrations.removeIndexes<IForeignBlock>(indexesToRemove, ForeignBlock);
        console.log(`[Migrations(${version})] Removed indexes`);
        await ForeignBlock.updateMany({}, { $rename: { foreignChainId: 'chainId' } });
        console.log(`[Migrations(${version})] foreignChainId renamed to chainId`);
        await db.collection('foreignblocks').rename('blockchaindatas');
        console.log(`[Migrations(${version})] ForeignBlocks collection renamed to blockchaindatas`);
        await Migrations.createIndexes<IBlockChainData>(indexesToCreate, BlockChainData);
        console.log(`[Migrations(${version})] Created Indexes`);

        const blocks = await Block.find();
        const blockDatas = [];
        const batchSize = 500;

        for (let i = 0; i < blocks.length; i++) {
          if (!blocks[i].anchor || !blocks[i].chainAddress || !blocks[i].blockId || !blocks[i].minter) {
            console.warn(`Missing important field for block ${blocks[i]._id}`);
            continue;
          }

          blockDatas.push({
            _id: `block::bsc::${blocks[i].blockId}`,
            anchor: blocks[i].anchor,
            chainId: 'bsc',
            chainAddress: blocks[i].chainAddress,
            minter: blocks[i].minter,
            blockId: blocks[i].blockId,
          });
        }

        console.log(`[Migrations(${version})] blockData size: ${blockDatas.length}`);
        const blockDataBatches = Migrations.splitIntoBatches(blockDatas, batchSize);

        await session.withTransaction(async () => {
          await Promise.all(
            blockDataBatches.map((blockData) => {
              return BlockChainData.insertMany(blockData);
            })
          );
        });

        await session.endSession();
      } catch (e) {
        await session.abortTransaction();
        throw new Error(`[Migrations(${version})] Aborting transaction ${e}`);
      } finally {
        const endTime = new Date().getTime();
        console.log(`[Migrations(${version})] Finish at ${endTime} after ${(endTime - startTime) / 1000} seconds`);
      }
    });
  };

  private static splitIntoBatches = (arr: unknown[], maxBatchSize: number): unknown[][] => {
    const batches: unknown[][] = [];
    const arrCopy = [...arr];

    while (arrCopy.length) {
      const batch = arrCopy.splice(0, maxBatchSize);
      batches.push(batch);
    }

    return batches;
  };

  private static removeIndexes = async <T>(indexes: string[], model: Model<T>): Promise<void> => {
    for (const indexToRemove of indexes) {
      if (await model.collection.indexExists(indexToRemove)) {
        await model.collection.dropIndex(indexToRemove);
        console.log(`index ${indexToRemove} removed`);
      }
    }
  };

  private static createIndexes = async <T>(indexes: Record<string, unknown>[], model: Model<T>): Promise<void> => {
    for (const indexToCreate of indexes) {
      if (!(await model.collection.indexExists(Object.keys(indexToCreate)))) {
        await model.collection.createIndex(indexToCreate);
        console.log(`index ${Object.keys(indexToCreate)} created`);
      }
    }
  };
}

export default Migrations;
