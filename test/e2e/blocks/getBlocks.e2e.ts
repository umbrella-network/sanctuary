import axios from 'axios';
import { loadTestEnv } from '../../helpers';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import User from '../../../src/models/User';
import Project from '../../../src/models/Project';
import ApiKey from '../../../src/models/ApiKey';
import Block from '../../../src/models/Block';
import Leaf from '../../../src/models/Leaf';
import { inputForBlockModel } from '../../fixtures/inputForBlockModel';
import mongoose from 'mongoose';

chai.use(chaiAsPromised);

describe('Getting blocks', () => {
  const config = loadTestEnv();
  const appAxios = axios.create({ baseURL: config.APP_URL });
  let apiKey: string;

  before(async () => {
    await mongoose.connect(config.MONGODB_URL, { useNewUrlParser: true, useUnifiedTopology: true });
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Project.deleteMany({});
    await ApiKey.deleteMany({});
    await Block.deleteMany({});
    await Leaf.deleteMany({});

    await appAxios.post('/users', {
      email: 'example@example.com',
      password: 'valid_password',
    });

    const response = await appAxios.post('/auth', {
      email: 'example@example.com',
      password: 'valid_password',
    });

    const accessToken = response.data.token;

    const createProjectResponse = await appAxios.post(
      '/projects',
      { name: 'First project' },
      { headers: { authorization: `Bearer ${accessToken}` } }
    );
    
    const createApiKeyResponse = await appAxios.post(
      '/api-keys',
      { projectId: createProjectResponse.data._id },
      { headers: { authorization: `Bearer ${accessToken}` } }
    );

    apiKey = createApiKeyResponse.data.key;
  });

  after(async () => {
    await User.deleteMany({});
    await Project.deleteMany({});
    await ApiKey.deleteMany({});
    await Block.deleteMany({});
    await Leaf.deleteMany({});

    await mongoose.connection.close();
  });

  it('returns only finalized blocks', async () => {
    await Block.create([
      { ...inputForBlockModel, _id: 'block::1', blockId: 1, status: 'new'},
      { ...inputForBlockModel, _id: 'block::2', blockId: 2, status: 'completed'},
      { ...inputForBlockModel, _id: 'block::3', blockId: 3, status: 'failed'},
      { ...inputForBlockModel, _id: 'block::4', blockId: 4, status: 'finalized'},
    ]);

    const blocksResponse = await appAxios.get('/blocks', { headers: { authorization: `Bearer ${apiKey}` } });
    const blocks = blocksResponse.data;
    expect(blocks).to.be.an('array').with.lengthOf(1);
    expect(blocks[0]).to.have.property('status', 'finalized');
  });

  it('returns blocks sorted in descending order by their height', async () => {
    await Block.create([
      { ...inputForBlockModel, _id: 'block::4', blockId: 4 },
      { ...inputForBlockModel, _id: 'block::1', blockId: 1 },
      { ...inputForBlockModel, _id: 'block::3', blockId: 3 },
      { ...inputForBlockModel, _id: 'block::2', blockId: 2 },
    ]);


    const blocksResponse = await appAxios.get('/blocks', { headers: { authorization: `Bearer ${apiKey}` } });
    const blocks: Record<string, unknown>[] = blocksResponse.data;
    
    expect(blocks).to.be.an('array').with.lengthOf(4);
    
    blocks.forEach((block, i) => {
      if (i === 0) {
        return;
      }

      expect(block.blockId).to.be.lessThan(blocks[i - 1].blockId as number);
    });
  });

  it('returns blocks respecting limit and offset parameters', async () => {
    await Block.create([
      { ...inputForBlockModel, _id: 'block::1', blockId: 1 },
      { ...inputForBlockModel, _id: 'block::2', blockId: 2 },
      { ...inputForBlockModel, _id: 'block::3', blockId: 3 },
      { ...inputForBlockModel, _id: 'block::4', blockId: 4 },
    ]);

    const blocksResponse = await appAxios.get('/blocks', { params: { limit: 2, offset: 1 }, headers: { authorization: `Bearer ${apiKey}` } });
    const blocks: Record<string, unknown>[] = blocksResponse.data;
    
    expect(blocks).to.be.an('array').with.lengthOf(2);
    expect(blocks[0]).to.have.property('height', 3);
    expect(blocks[1]).to.have.property('height', 2);
  });

  it('returns block by it\'s id', async () => {
    await Block.create([
      { ...inputForBlockModel, _id: 'block::1', blockId: 1 },
      { ...inputForBlockModel, _id: 'block::2', blockId: 2 },
      { ...inputForBlockModel, _id: 'block::3', blockId: 3 },
      { ...inputForBlockModel, _id: 'block::4', blockId: 4 },
    ]);

    const blockResponse = await appAxios.get('/blocks/block::3', { params: { limit: 2, offset: 1 }, headers: { authorization: `Bearer ${apiKey}` } });
    const block: Record<string, unknown> = blockResponse.data.data;
    
    expect(block).to.have.property('_id', 'block::3');
  });


  it('returns leaves for a block', async () => {
    await Block.create([
      { ...inputForBlockModel, _id: 'block::1', blockId: 1 },
      { ...inputForBlockModel, _id: 'block::2', blockId: 2 },
      { ...inputForBlockModel, _id: 'block::3', blockId: 3 },
      { ...inputForBlockModel, _id: 'block::4', blockId: 4 },
    ]);

    await Leaf.create([
      { _id: 'leaf::block::1::a', blockId: 'block::1', key: 'a', value: '0x0', proof: []},
      { _id: 'leaf::block::1::b', blockId: 'block::1', key: 'b', value: '0x0', proof: []},
      { _id: 'leaf::block::2::a', blockId: 'block::2', key: 'a', value: '0x0', proof: []},
      { _id: 'leaf::block::2::b', blockId: 'block::2', key: 'b', value: '0x0', proof: []},
      { _id: 'leaf::block::3::a', blockId: 'block::3', key: 'a', value: '0x0', proof: []},
      { _id: 'leaf::block::4::a', blockId: 'block::4', key: 'a', value: '0x0', proof: []},
    ]);

    const leavesResponse = await appAxios.get('/blocks/block::1/leaves', { headers: { authorization: `Bearer ${apiKey}` } });
    const leaves: Record<string, unknown>[] = leavesResponse.data;

    expect(leaves).to.be.an('array').with.lengthOf(2);

    leaves.forEach(leaf => {
      expect(leaf).to.have.property('blockId', 'block::1');
    });
  });
});
