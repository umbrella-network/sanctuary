import { expect } from 'chai';
import { foreignBlockFactory } from '../../mocks/factories/foreignBlockFactory';
import ForeignBlock, { IForeignBlock } from '../../../src/models/ForeignBlock';
import { loadTestEnv } from '../../helpers';
import mongoose from 'mongoose';
import axios from 'axios';
import { setupTestUser, teardownTestUser, TestUserHarness } from '../../helpers/authHelpers';

describe('/foreign-blocks', async () => {
  let credentials: TestUserHarness;
  const config = loadTestEnv();
  const adapter = axios.create({ baseURL: config.APP_URL });

  before(async () => {
    await mongoose.connect(config.MONGODB_URL, { useNewUrlParser: true, useUnifiedTopology: true });
    await teardownTestUser();
    await ForeignBlock.deleteMany({});
    credentials = await setupTestUser();
  });

  after(async () => {
    await ForeignBlock.deleteMany({});
    await teardownTestUser();
    await mongoose.connection.close();
  });

  describe('GET /', async () => {
    let foreignBlocks: IForeignBlock[];

    const operation = async () => adapter.get('/foreign-blocks', {
      headers: {
        authorization: `Bearer ${credentials.apiKey.key}`
      }
    });

    before(async () => {
      foreignBlocks = [];

      for (let i = 0; i < 3; i++) {
        const foreignBlock = new ForeignBlock(foreignBlockFactory.build());
        await foreignBlock.save();
        foreignBlocks.push(foreignBlock);
      }
    });

    it('returns foreign blocks', async () => {
      const response = await operation();
      const subject = response.data;
      expect(response.status).to.eq(200);
      expect(subject).to.be.an('array').with.length(3);

      for (const block of subject) {
        const matchingForeignBlock = foreignBlocks.find((e) => e._id == block._id);
        expect(matchingForeignBlock).to.exist;
        expect(block.blockId).to.eq(matchingForeignBlock.blockId);
        expect(block.foreignChainId).to.eq(matchingForeignBlock.foreignChainId);
        expect(block.anchor).to.eq(matchingForeignBlock.anchor);
      }
    });
  });

  describe('GET /:foreignChainId/:blockId', async () => {
    let foreignBlock: IForeignBlock;
    let subject: IForeignBlock;

    const operation = async (foreignChainId: string, blockId: number) =>
      adapter.get(
        `/foreign-blocks/${foreignChainId}/${blockId}`,
        {
          headers: {
            authorization: `Bearer ${credentials.apiKey.key}`
          }
        });

    before(async () => {
      foreignBlock = new ForeignBlock(foreignBlockFactory.build());
      await foreignBlock.save();
    });

    it('returns the correct block', async () => {
      const response = await operation(foreignBlock.foreignChainId, foreignBlock.blockId);
      subject = response.data.data;
      expect(response.status).to.eq(200);
      expect(subject._id).to.eq(foreignBlock._id);
      expect(subject.blockId).to.eq(foreignBlock.blockId);
      expect(subject.foreignChainId).to.eq(foreignBlock.foreignChainId);
      expect(subject.anchor).to.eq(foreignBlock.anchor);
    });
  });
});
