/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import { loadTestEnv } from '../../helpers';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import Block, { IBlock } from '../../../src/models/Block';
import Leaf from '../../../src/models/Leaf';
import { inputForBlockModel } from '../../fixtures/inputForBlockModel';
import { setupDatabase, teardownDatabase } from '../../helpers/databaseHelpers';
import { setupTestUser, teardownTestUser, TestUserHarness } from '../../helpers/authHelpers';
import ForeignBlock, { IForeignBlock } from '../../../src/models/ForeignBlock';
import { foreignBlockFactory } from '../../mocks/factories/foreignBlockFactory';
import { blockFactory } from '../../mocks/factories/blockFactory';
import { BlockStatus } from '@umb-network/toolbox/dist/types/BlockStatuses';

chai.use(chaiAsPromised);

describe('Getting proofs', () => {
  let credentials: TestUserHarness;
  const config = loadTestEnv();
  const appAxios = axios.create({ baseURL: config.APP_URL });

  before(async () => {
    await setupDatabase();
    await teardownTestUser();
    credentials = await setupTestUser();
  });

  after(async () => {
    await teardownTestUser();
    await teardownDatabase();
  });

  describe('when no chain ID is provided', async () => {
    beforeEach(async () => {
      await Block.deleteMany({});
      await Leaf.deleteMany({});
    });

    afterEach(async () => {
      await Block.deleteMany({});
      await Leaf.deleteMany({});
    });

    it('returns valid response without leaves for the latest finalized block when keys are not specified', async () => {
      await Block.create([
        { ...inputForBlockModel, _id: 'block::1', blockId: 1, status: 'new'},
        { ...inputForBlockModel, _id: 'block::2', blockId: 2, status: 'finalized'},
        { ...inputForBlockModel, _id: 'block::3', blockId: 3, status: 'failed'},
        { ...inputForBlockModel, _id: 'block::4', blockId: 4, status: 'finalized'},
      ]);

      const proofsResponse = await appAxios.get('/proofs', { headers: { authorization: `Bearer ${credentials.apiKey.key}` } });
      expect(proofsResponse.data).to.be.an('object');
      expect(proofsResponse.data.data.block).to.be.an('object');
      expect(proofsResponse.data.data.block).to.have.property('blockId', 4);
      expect(proofsResponse.data.data.block).to.have.property('status', 'finalized');
      expect(proofsResponse.data.data.keys).to.be.an('array').that.is.empty;
      expect(proofsResponse.data.data.leaves).to.be.an('array').that.is.empty;
    });

    it('returns latest block with leaves matching specified keys', async () => {
      await Block.create([
        { ...inputForBlockModel, _id: 'block::1', blockId: 1 },
        { ...inputForBlockModel, _id: 'block::2', blockId: 2 },
        { ...inputForBlockModel, _id: 'block::3', blockId: 3 },
        { ...inputForBlockModel, _id: 'block::4', blockId: 4 },
      ]);

      await Leaf.create([
        { _id: 'leaf::block::1::a', blockId: 1, key: 'a', value: '0x0', proof: []},
        { _id: 'leaf::block::2::a', blockId: 2, key: 'a', value: '0x0', proof: []},
        { _id: 'leaf::block::3::a', blockId: 3, key: 'a', value: '0x0', proof: []},
        { _id: 'leaf::block::4::a', blockId: 4, key: 'a', value: '0x0', proof: []},
        { _id: 'leaf::block::4::b', blockId: 4, key: 'b', value: '0x0', proof: []},
        { _id: 'leaf::block::4::c', blockId: 4, key: 'c', value: '0x0', proof: []},
      ]);

      const proofsResponse = await appAxios.get('/proofs', { params: { keys: ['a', 'b'] }, headers: { authorization: `Bearer ${credentials.apiKey.key}` } });

      expect(proofsResponse.status).to.be.eq(200);

      expect(proofsResponse.data).to.be.an('object');
      expect(proofsResponse.data.data.block).to.be.an('object');
      expect(proofsResponse.data.data.block).to.have.property('blockId', 4);

      expect(proofsResponse.data.data.keys).to.be.an('array').deep.eq(['a', 'b']);
      expect(proofsResponse.data.data.leaves).to.be.an('array').with.lengthOf(2);

      const leafWithKeyA = proofsResponse.data.data.leaves.find((leaf: any) => leaf.key === 'a');
      expect(leafWithKeyA).to.be.an('object').that.has.property('key', 'a');
      expect(leafWithKeyA).to.be.an('object').that.has.property('blockId', 4);

      const leafWithKeyB = proofsResponse.data.data.leaves.find((leaf: any) => leaf.key === 'b');
      expect(leafWithKeyB).to.be.an('object').that.has.property('key', 'b');
      expect(leafWithKeyB).to.be.an('object').that.has.property('blockId', 4);
    });

    it('returns empty object if no finalized block found', async () => {
      await Block.create([
        { ...inputForBlockModel, _id: 'block::1', blockId: 1, status: 'new'},
        { ...inputForBlockModel, _id: 'block::2', blockId: 2, status: 'failed'},
        { ...inputForBlockModel, _id: 'block::3', blockId: 3, status: 'failed'},
        { ...inputForBlockModel, _id: 'block::4', blockId: 4, status: 'failed'},
      ]);

      const proofsResponse = await appAxios.get('/proofs', { headers: { authorization: `Bearer ${credentials.apiKey.key}` } });

      expect(proofsResponse.data).to.be.an('object');
      expect(proofsResponse.data.data).to.be.an('object').that.is.empty;
    });

  });


  describe('when a foreign Chain ID is provided', async () => {
    let foreignBlock: IForeignBlock;
    let block: IBlock;

    const operation = async (chainId: string) => appAxios.get(
      `/proofs?chainId=${chainId}`,
      {
        headers: {
          authorization: `Bearer ${credentials.apiKey.key}`
        }
      }
    );

    beforeEach(async () => {
      await Block.deleteMany({});
      await Leaf.deleteMany({});
      await ForeignBlock.deleteMany({});

      foreignBlock = new ForeignBlock(foreignBlockFactory.build());
      await foreignBlock.save();

      block = new Block(blockFactory.build({
        status: BlockStatus.Finalized,
        blockId: foreignBlock.blockId
      }));

      await block.save();
      const nonFinalizedBlock = new Block(blockFactory.build({ blockId: 1000, status: BlockStatus.New }));
      await nonFinalizedBlock.save();
    });

    afterEach(async () => {
      await Block.deleteMany({});
      await Leaf.deleteMany({});
      await ForeignBlock.deleteMany({});
    });

    it('returns the latest finalized block', async () => {
      const response = await operation('ethereum');
      const subject = response.data.data.block;
      expect(subject._id).to.eq(block._id);
      expect(subject.blockId).to.eq(block.blockId);
    });
  });
});
