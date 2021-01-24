/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import { Container } from 'inversify';
import { mockedLogger } from '../mocks/logger';
import LeavesSynchronizer from '../../src/services/LeavesSynchronizer';
import ValidatorRegistryContract from '../../src/contracts/ValidatorRegistryContract';
import sinon from 'sinon';
import { ethers } from 'ethers';
import mongoose from 'mongoose';
import { loadTestEnv } from '../helpers';
import Block from '../../src/models/Block';
import Leaf from '../../src/models/Leaf';
import SortedMerkleTreeFactory from '../../src/services/SortedMerkleTreeFactory';
import moxios from 'moxios';
import { LeafType, LeafValueCoder } from '@umb-network/toolbox';
import { expect } from 'chai';
import { inputForBlockModel } from '../fixtures/input-for-block-model';

describe('LeavesSynchronizer', () => {
  let container: Container;
  let mockedValidatorRegistryContract: sinon.SinonStubbedInstance<ValidatorRegistryContract>;
  let leavesSynchronizer: LeavesSynchronizer;

  before(async () => {
    const config = loadTestEnv();
    mongoose.set('useFindAndModify', false);
    await mongoose.connect(config.MONGODB_URL, { useNewUrlParser: true, useUnifiedTopology: true });
  });

  beforeEach(async () => {
    moxios.uninstall();

    container = new Container({ autoBindInjectable: true });

    // Mocking dependencies and adding them to the container
    mockedValidatorRegistryContract = sinon.createStubInstance(ValidatorRegistryContract);
    container.bind('Logger').toConstantValue(mockedLogger);
    container.bind(ValidatorRegistryContract).toConstantValue(mockedValidatorRegistryContract as unknown as ValidatorRegistryContract);
    container.bind(SortedMerkleTreeFactory).toSelf();

    // Adding LeavesSynchronizer to the container
    container.bind(LeavesSynchronizer).toSelf();

    leavesSynchronizer = container.get(LeavesSynchronizer);

    // Clearing DB before each test
    await Block.deleteMany({});
    await Leaf.deleteMany({});
  });

  after(async () => {
    moxios.uninstall();

    await Block.deleteMany({});
    await Leaf.deleteMany({});

    await mongoose.connection.close();
  });

  it('returns "false" if root hashes do not match', async () => {
    const block = await Block.create({
      ...inputForBlockModel,
      root: ethers.utils.keccak256('0x1234'), // overwrite inputForBlockModel with a wrong root hash
    });

    mockedValidatorRegistryContract.validators.resolves({ location: 'http://validator-address' } as any);

    moxios.install();
    moxios.stubRequest(/http:\/\/validator-address\/blocks\/height\/.+/, {
      status: 200,
      response: {
        data: {
          data: {
            'ETH-USD': '0x' + LeafValueCoder.encode(100, LeafType.TYPE_FLOAT).toString('hex'),
          }
        }
      }
    });

    const result = await leavesSynchronizer.apply(block._id);

    expect(result).to.be.false;
  });


  it('returns "true" if root hashes match', async () => {
    const block = await Block.create(inputForBlockModel);

    mockedValidatorRegistryContract.validators.resolves(({ location: 'http://validator-address' } as any));

    moxios.install();
    moxios.stubRequest(/http:\/\/validator-address\/blocks\/height\/.+/, {
      status: 200,
      response: {
        data: {
          data: {
            'ETH-USD': '0x' + LeafValueCoder.encode(100, LeafType.TYPE_FLOAT).toString('hex'),
          }
        }
      }
    });

    const result = await leavesSynchronizer.apply(block._id);

    expect(result).to.be.true;
  });

  it('saves leaves correctly if root hashes match', async () => {
    const block = await Block.create(inputForBlockModel);

    mockedValidatorRegistryContract.validators.resolves({ location: 'http://validator-address' } as any);

    const treeData = {
      'ETH-USD': '0x' + LeafValueCoder.encode(100, LeafType.TYPE_FLOAT).toString('hex'),
    };

    moxios.install();
    moxios.stubRequest(/http:\/\/validator-address\/blocks\/height\/.+/, {
      status: 200,
      response: {
        data: {
          data: treeData
        }
      }
    });

    await leavesSynchronizer.apply(block._id);

    const leaves = await Leaf.find({});
    
    expect(leaves.length).to.be.equal(1, 'number of created leaves is not correct');

    const [leaf] = leaves;

    expect(leaf).to.have.property('_id', 'leaf::block::1::ETH-USD');
    expect(leaf).to.have.property('blockId', 'block::1');
    expect(leaf).to.have.property('key', 'ETH-USD');
    expect(leaf).to.have.property('value', treeData['ETH-USD']);
  });

  it('updates block\'s numericFcdKeys if root hashes match', async () => {
    const block = await Block.create({
      ...inputForBlockModel,
      numericFcdKeys: [], // overwrite inputForBlockModel with an empty numericFcdKeys, we will check if LeavesSynchronizer will update it
    });

    mockedValidatorRegistryContract.validators.resolves({ location: 'http://validator-address' } as any);

    const treeData = {
      'ETH-USD': '0x' + LeafValueCoder.encode(100, LeafType.TYPE_FLOAT).toString('hex'),
    };

    moxios.install();
    moxios.stubRequest(/http:\/\/validator-address\/blocks\/height\/.+/, {
      status: 200,
      response: {
        data: {
          numericFcdKeys: ['ETH-USD'],
          data: treeData
        }
      }
    });

    await leavesSynchronizer.apply(block._id);

    const blockAfterLeavesSynchronizerRun = await Block.findOne({ _id: block._id });

    expect(blockAfterLeavesSynchronizerRun).to.have.property('numericFcdKeys').that.deep.equal(['ETH-USD']);
  });
});
