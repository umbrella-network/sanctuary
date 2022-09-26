import newrelic from 'newrelic';
import Block from '../models/Block';
import Migration from '../models/Migration';
import BlockChainData, { IBlockChainData } from '../models/BlockChainData';
import mongoose, { Model } from 'mongoose';
import { sleep } from '../utils/sleep';
import ForeignBlock, { IForeignBlock } from '../models/ForeignBlock';
import { BlockStatus } from '../types/blocks';

class Migrations {
  static async apply(): Promise<void> {
    await Migrations.migrateTo520();
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

  /**
   * 1. Delete blockchaindatas since it is created automatically
   * 2. Rename foreignblocks collection to blockchaindatas
   * 3. Insert all blocks from blocks collection
   *   into blockchaindatas collection setting foreignchainId='bsc'
   * 4. Get blockchaindatas with missing status
   * 5. Copy status from blocks
   * 6. Update missing status with New
   */
  private static migrateTo520 = async () => {
    await sleep(15000); // this is necessary to blockchaindatas collection be created
    const version = '5.2.0';
    const startTime = new Date().getTime();
    const indexesToRemove = ['blockId_1_foreignChainId_1', 'chainAddress_1', 'minter_1'];
    const indexesToCreate = [{ blockId: -1 }, { anchor: -1 }, { status: 1 }];

    await Migrations.wrapMigration(version, async () => {
      const session = await mongoose.startSession();
      try {
        console.log(`[Migrations(${version})] Starting migration - ${startTime}`);
        const db = mongoose.connection.db;
        const blockChainDataCount = await BlockChainData.countDocuments({});
        console.log(`[Migrations(${version})] blockChainDataCount ${blockChainDataCount}`);
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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const blocks = (await Block.find().exec()) as any[];
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
            status: blocks[i].status,
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

        console.log(`[Migrations(${version})] Start copying missing status`);
        const blockChainDatas = await BlockChainData.find({ status: undefined });
        console.log(`[Migrations(${version})] number of blockChainDatas with missing status ${blockChainDatas.length}`);

        const blocksWithStatus = await Block.find({
          blockId: { $in: blockChainDatas.map((blockchainData) => blockchainData.blockId) },
        }).exec();

        console.log(`[Migrations(${version})] number of blocks found ${blocksWithStatus.length}`);

        await session.withTransaction(async () => {
          await Promise.all(
            blocksWithStatus.map((block) => {
              return BlockChainData.updateMany({ blockId: block.blockId }, { status: block.status as BlockStatus });
            })
          );
        });

        const blockChainDatas2 = await BlockChainData.find({ status: undefined });

        console.log(
          `[Migrations(${version})] number of blockChainDatas with missing status(2) ${blockChainDatas2.length}`
        );

        await session.withTransaction(async () => {
          await BlockChainData.updateMany({ status: undefined }, { status: BlockStatus.New });
        });

        await session.endSession();
      } catch (e) {
        if (await session.inTransaction()) {
          await session.abortTransaction();
        }

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
