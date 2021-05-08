/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import {Container} from 'inversify';
import {mockedLogger} from '../mocks/logger';
import LeavesSynchronizer from '../../src/services/LeavesSynchronizer';
import ValidatorRegistryContract from '../../src/contracts/ValidatorRegistryContract';
import sinon from 'sinon';
import {BigNumber, ethers} from 'ethers';
import mongoose from 'mongoose';
import {loadTestEnv} from '../helpers';
import Block from '../../src/models/Block';
import Leaf from '../../src/models/Leaf';
import SortedMerkleTreeFactory from '../../src/services/SortedMerkleTreeFactory';
import moxios from 'moxios';
import {LeafType, LeafValueCoder} from '@umb-network/toolbox';
import {expect} from 'chai';
import {inputForBlockModel} from '../fixtures/inputForBlockModel';
import ChainContract from '../../src/contracts/ChainContract';
import FCD from '../../src/models/FCD';

describe('LeavesSynchronizer', () => {
  let container: Container;
  let mockedChainContract: sinon.SinonStubbedInstance<ChainContract>;
  let mockedValidatorRegistryContract: sinon.SinonStubbedInstance<ValidatorRegistryContract>;
  let leavesSynchronizer: LeavesSynchronizer;

  before(async () => {
    const config = loadTestEnv();
    mongoose.set('useFindAndModify', false);
    await mongoose.connect(config.MONGODB_URL, {useNewUrlParser: true, useUnifiedTopology: true});
  });

  beforeEach(async () => {
    moxios.uninstall();

    container = new Container({autoBindInjectable: true});

    // Mocking dependencies and adding them to the container
    mockedChainContract = sinon.createStubInstance(ChainContract);
    mockedValidatorRegistryContract = sinon.createStubInstance(ValidatorRegistryContract);
    container.bind('Logger').toConstantValue(mockedLogger);
    container.bind(ChainContract).toConstantValue(mockedChainContract as unknown as ChainContract);
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
    await FCD.deleteMany({});

    await mongoose.connection.close();
  });

  it('returns "false/null" if root hashes do not match', async () => {
    const block = await Block.create({
      ...inputForBlockModel,
      root: ethers.utils.keccak256('0x1234'), // overwrite inputForBlockModel with a wrong root hash
    });

    mockedValidatorRegistryContract.validators.resolves({location: 'http://validator-address'} as any);

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


    expect(await leavesSynchronizer.apply(block.height, block._id)).to.equal(null, 'null for current block');
    expect(await leavesSynchronizer.apply(block.height - 1, block._id)).to.equal(false, 'false for old blocks');
  });


  it('returns "true" if root hashes match', async () => {
    const block = await Block.create(inputForBlockModel);

    mockedValidatorRegistryContract.validators.resolves(({location: 'http://validator-address'} as any));
    mockedChainContract.resolveFCDs.resolves(([[BigNumber.from(1)], [BigNumber.from('17005632')]] as any));

    moxios.install();
    moxios.stubRequest(/http:\/\/validator-address\/blocks\/height\/.+/, {
      status: 200,
      response: {
        data: {
          data: {
            'ETH-USD': '0x' + LeafValueCoder.encode(100, LeafType.TYPE_FLOAT).toString('hex'),
          },
          numericFcdKeys: ['ETH-USD'],
          numericFcdValues: [1700.5632],
        }
      }
    });

    const result = await leavesSynchronizer.apply(block.height, block._id);

    expect(result).to.be.true;
  });

  it('saves leaves correctly if root hashes match', async () => {
    const block = await Block.create(inputForBlockModel);

    mockedValidatorRegistryContract.validators.resolves({location: 'http://validator-address'} as any);
    mockedChainContract.resolveFCDs.resolves(([[BigNumber.from(999)], [BigNumber.from('17005632')]] as any));

    const treeData = {
      'ETH-USD': '0x' + LeafValueCoder.encode(100, LeafType.TYPE_FLOAT).toString('hex'),
    };

    moxios.install();
    moxios.stubRequest(/http:\/\/validator-address\/blocks\/height\/.+/, {
      status: 200,
      response: {
        data: {
          data: treeData,
          numericFcdKeys: ['ETH-USD'],
          numericFcdValues: [1700.5632],
        }
      }
    });

    await leavesSynchronizer.apply(block.height, block._id);

    const leaves = await Leaf.find({});
    const fcds = await FCD.find({});

    expect(leaves.length).to.be.equal(1, 'number of created leaves is not correct');
    expect(fcds.length).to.be.equal(1, 'number of created FCDs is not correct');

    const [leaf] = leaves;

    expect(leaf).to.have.property('_id', 'leaf::block::1::ETH-USD');
    expect(leaf).to.have.property('blockId', 'block::1');
    expect(leaf).to.have.property('key', 'ETH-USD');
    expect(leaf).to.have.property('value', treeData['ETH-USD']);

    expect(fcds[0]).to.have.property('value', 999e-18);
  });
});
