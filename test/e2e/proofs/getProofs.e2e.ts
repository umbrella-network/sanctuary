/* eslint-disable @typescript-eslint/no-explicit-any */
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

describe('Getting proofs', () => {
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

  it('returns valid response without leaves for the latest finalized block when keys are not specified', async () => {
    await Block.create([
      { ...inputForBlockModel, _id: 'block::1', blockId: 1, status: 'new'},
      { ...inputForBlockModel, _id: 'block::2', blockId: 2, status: 'finalized'},
      { ...inputForBlockModel, _id: 'block::3', blockId: 3, status: 'failed'},
      { ...inputForBlockModel, _id: 'block::4', blockId: 4, status: 'finalized'},
    ]);

    const proofsResponse = await appAxios.get('/proofs', { headers: { authorization: `Bearer ${apiKey}` } });

    expect(proofsResponse.data).to.be.an('object');
    expect(proofsResponse.data.data.block).to.be.an('object');
    expect(proofsResponse.data.data.block).to.have.property('height', 4);
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
      { _id: 'leaf::block::1::a', blockId: 'block::1', key: 'a', value: '0x0', proof: []},
      { _id: 'leaf::block::2::a', blockId: 'block::2', key: 'a', value: '0x0', proof: []},
      { _id: 'leaf::block::3::a', blockId: 'block::3', key: 'a', value: '0x0', proof: []},
      { _id: 'leaf::block::4::a', blockId: 'block::4', key: 'a', value: '0x0', proof: []},
      { _id: 'leaf::block::4::b', blockId: 'block::4', key: 'b', value: '0x0', proof: []},
      { _id: 'leaf::block::4::c', blockId: 'block::4', key: 'c', value: '0x0', proof: []},
    ]);

    const proofsResponse = await appAxios.get('/proofs', { params: { keys: ['a', 'b'] }, headers: { authorization: `Bearer ${apiKey}` } });

    expect(proofsResponse.status).to.be.eq(200);

    expect(proofsResponse.data).to.be.an('object');
    expect(proofsResponse.data.data.block).to.be.an('object');
    expect(proofsResponse.data.data.block).to.have.property('height', 4);

    expect(proofsResponse.data.data.keys).to.be.an('array').deep.eq(['a', 'b']);
    expect(proofsResponse.data.data.leaves).to.be.an('array').with.lengthOf(2);
    
    const leafWithKeyA = proofsResponse.data.data.leaves.find((leaf: any) => leaf.key === 'a');
    expect(leafWithKeyA).to.be.an('object').that.has.property('key', 'a');
    expect(leafWithKeyA).to.be.an('object').that.has.property('blockId', 'block::4');

    const leafWithKeyB = proofsResponse.data.data.leaves.find((leaf: any) => leaf.key === 'b');
    expect(leafWithKeyB).to.be.an('object').that.has.property('key', 'b');
    expect(leafWithKeyB).to.be.an('object').that.has.property('blockId', 'block::4');
  });

  it('returns empty object if no finalized block found', async () => {
    await Block.create([
      { ...inputForBlockModel, _id: 'block::1', blockId: 1, status: 'new'},
      { ...inputForBlockModel, _id: 'block::2', blockId: 2, status: 'failed'},
      { ...inputForBlockModel, _id: 'block::3', blockId: 3, status: 'failed'},
      { ...inputForBlockModel, _id: 'block::4', blockId: 4, status: 'failed'},
    ]);


    const proofsResponse = await appAxios.get('/proofs', { headers: { authorization: `Bearer ${apiKey}` } });

    expect(proofsResponse.data).to.be.an('object');
    expect(proofsResponse.data.data).to.be.an('object').that.is.empty;
  });
});
