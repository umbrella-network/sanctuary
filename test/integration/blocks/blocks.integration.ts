import { expect } from 'chai';
import { foreignBlockFactory } from '../../mocks/factories/foreignBlockFactory';
import ForeignBlock, { IForeignBlock } from '../../../src/models/ForeignBlock';
import { loadTestEnv } from '../../helpers';
import axios from 'axios';
import { setupTestUser, teardownTestUser, TestUserHarness } from '../../helpers/authHelpers';
import Block, { IBlock } from '../../../src/models/Block';
import { blockFactory } from '../../mocks/factories/blockFactory';
import { setupDatabase, teardownDatabase } from '../../helpers/databaseHelpers';

describe('/blocks', async () => {
  let credentials: TestUserHarness;
  const config = loadTestEnv();
  const adapter = axios.create({ baseURL: config.APP_URL });

  before(async () => {
    await setupDatabase();
    await teardownTestUser();
    await ForeignBlock.deleteMany({});
    await Block.deleteMany();
    credentials = await setupTestUser();
  });

  after(async () => {
    await ForeignBlock.deleteMany({});
    await teardownTestUser();
    await ForeignBlock.deleteMany({});
    await Block.deleteMany();
    await teardownDatabase();
  });

  describe('GET /', async () => {
    let foreignBlocks: IForeignBlock[];
    let blocks: IBlock[];

    const operation = async (chainId: string) => adapter.get('/blocks', {
      params: { chainId },
      headers: {
        authorization: `Bearer ${credentials.apiKey.key}`
      }
    });

    before(async () => {
      foreignBlocks = [];
      blocks = [];

      for (let i = 0; i < 3; i++) {
        const foreignBlock = new ForeignBlock(foreignBlockFactory.build());
        await foreignBlock.save();
        const block = new Block(blockFactory.build({ blockId: foreignBlock.blockId }));
        await block.save();
        foreignBlocks.push(foreignBlock);
        blocks.push(block);
      }
    });

    it('returns foreign blocks', async () => {
      const response = await operation('ethereum');
      const subject = response.data;
      expect(response.status).to.eq(200);
      expect(subject).to.be.an('array').with.length(3);

      for (const block of subject) {
        const match = blocks.find((e) => e.blockId == block.blockId);
        expect(match).to.exist;
      }
    });
  });

  describe('GET /:blockId', async () => {
    let foreignBlock: IForeignBlock;
    let block: IBlock;
    let subject: IForeignBlock;

    const operation = async (foreignChainId: string, blockId: number) =>
      adapter.get(
        `/blocks/${blockId}?chainId=${foreignChainId}`,
        {
          headers: {
            authorization: `Bearer ${credentials.apiKey.key}`
          }
        });

    before(async () => {
      foreignBlock = new ForeignBlock(foreignBlockFactory.build());
      await foreignBlock.save();

      block = new Block({ ...blockFactory.build(), blockId: foreignBlock.blockId });
      await block.save();
    });

    it('returns the correct block', async () => {
      const response = await operation(foreignBlock.foreignChainId, foreignBlock.blockId);
      subject = response.data.data;
      expect(response.status).to.eq(200);
      expect(subject._id).to.eq(block._id);
      expect(subject.blockId).to.eq(block.blockId);
      // expect(subject.foreignChainId).to.eq(foreignBlock.foreignChainId);
      expect(subject.anchor).to.eq(foreignBlock.anchor);
    });
  });
});
