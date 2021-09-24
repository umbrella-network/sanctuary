/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import {Container} from 'inversify';
import {mockedLogger} from '../mocks/logger';
import LeavesSynchronizer from '../../src/services/LeavesSynchronizer';
import StakingBankContract from '../../src/contracts/StakingBankContract';
import sinon from 'sinon';
import {BigNumber, ethers} from 'ethers';
import mongoose from 'mongoose';
import {loadTestEnv} from '../helpers';
import Block from '../../src/models/Block';
import Leaf from '../../src/models/Leaf';
import SortedMerkleTreeFactory from '../../src/services/SortedMerkleTreeFactory';
import moxios from 'moxios';
import {LeafValueCoder} from '@umb-network/toolbox';
import {expect} from 'chai';
import {inputForBlockModel} from '../fixtures/inputForBlockModel';
import {ChainContract} from '../../src/contracts/ChainContract';
import FCD from '../../src/models/FCD';
import {ChainStatus} from '../../src/types/ChainStatus';
import {Validator} from '../../src/types/Validator';
import {BlockFromPegasus} from '../../src/types/blocks';
import settings from '../../src/config/settings';

const resolveValidators = (chainStatus: ChainStatus): Validator[] => {
  return chainStatus.validators.map((address, i) => {
    return {
      id: address,
      location: chainStatus.locations[i],
      power: chainStatus.powers[i],
    };
  });
};

describe('LeavesSynchronizer', () => {
  let container: Container;
  let mockedChainContract: sinon.SinonStubbedInstance<ChainContract>;
  let mockedValidatorRegistryContract: sinon.SinonStubbedInstance<StakingBankContract>;
  let leavesSynchronizer: LeavesSynchronizer;

  const chainStatus: ChainStatus = {
    blockNumber: BigNumber.from(1),
    timePadding: 100,
    lastBlockId: 1,
    nextBlockId: 1,
    nextLeader: '0x222',
    validators: ['0x111'],
    locations: ['http://validator-address'],
    lastDataTimestamp: 1,
    powers: [BigNumber.from(1)],
    staked: BigNumber.from(1),
    minSignatures: 1,
  };

  const blockFromPegasus: BlockFromPegasus = {
    _id: 'block::2',
    mintedAt: new Date(),
    timestamp: new Date(),
    data: {
      'ETH-USD': '0x' + LeafValueCoder.encode(100, 'ETH-USD').toString('hex'),
    },
    blockId: 2,
    root: '0x321',
  };

  before(async () => {
    const config = loadTestEnv();
    mongoose.set('useFindAndModify', false);
    await mongoose.connect(config.MONGODB_URL, {useNewUrlParser: true, useUnifiedTopology: true});
  });

  beforeEach(async () => {
    moxios.uninstall();
    settings.app.feedsOnChain = 'test/fixtures/feeds-example.yaml';

    container = new Container({autoBindInjectable: true});

    // Mocking dependencies and adding them to the container
    mockedChainContract = sinon.createStubInstance(ChainContract);
    mockedValidatorRegistryContract = sinon.createStubInstance(StakingBankContract);
    container.bind('Logger').toConstantValue(mockedLogger);
    container.bind('Settings').toConstantValue(settings);
    container.bind(ChainContract).toConstantValue(mockedChainContract as unknown as ChainContract);
    container.bind(StakingBankContract).toConstantValue(mockedValidatorRegistryContract as unknown as StakingBankContract);
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

    moxios.install();
    moxios.stubRequest(/http:\/\/validator-address\/blocks\/blockId\/.+/, {
      status: 200,
      response: {
        data: {
          ...blockFromPegasus,
          data: {
            'ETH-USD': '0x' + LeafValueCoder.encode(10, 'ETH-USD').toString('hex'),
          },
        }
      }
    });

    const oldStatus = {
      ...chainStatus,
      lastBlockId: chainStatus.lastBlockId - 1,
      nextBlockId: chainStatus.nextBlockId - 1
    };

    mockedChainContract.resolveValidators.returns(resolveValidators(chainStatus));
    mockedChainContract.resolveFCDs.resolves(([[BigNumber.from(1)], [BigNumber.from('17005632')]] as any));

    expect(await leavesSynchronizer.apply(chainStatus, block._id)).to.equal(null, 'null for current block');
    expect(await leavesSynchronizer.apply(oldStatus, block._id)).to.equal(false, 'false for old blocks');
  });


  it('returns "true" if root hashes match', async () => {
    const block = await Block.create(inputForBlockModel);
    mockedChainContract.resolveValidators.returns(resolveValidators(chainStatus));
    mockedChainContract.resolveFCDs.resolves(([[BigNumber.from(1)], [17005632]]));
    moxios.install();

    moxios.stubRequest(/http:\/\/validator-address\/blocks\/blockId\/.+/, {
      status: 200,
      response: {
        data: [blockFromPegasus]
      }
    });

    const result = await leavesSynchronizer.apply(chainStatus, block._id);
    expect(result).to.be.true;
  });

  it('saves leaves correctly if root hashes match', async () => {
    const block = await Block.create(inputForBlockModel);

    mockedChainContract.resolveValidators.returns(resolveValidators(chainStatus));
    mockedChainContract.resolveFCDs.resolves(([[BigNumber.from(999)], [BigNumber.from('17005632')]] as any));

    const treeData = {
      'ETH-USD': '0x' + LeafValueCoder.encode(100,'ETH-USD').toString('hex'),
    };

    moxios.install();
    moxios.stubRequest(/http:\/\/validator-address\/blocks\/blockId\/.+/, {
      status: 200,
      response: {
        data: [blockFromPegasus]
      }
    });

    await leavesSynchronizer.apply(chainStatus, block._id);

    const leaves = await Leaf.find({});
    const fcds = await FCD.find({});

    expect(leaves.length).to.be.equal(1, 'number of created leaves is not correct');
    expect(fcds.length).to.be.equal(1, 'number of created FCDs is not correct');

    const [leaf] = leaves;

    expect(leaf).to.have.property('_id', 'block::1::leaf::ETH-USD');
    expect(leaf).to.have.property('blockId', 1);
    expect(leaf).to.have.property('key', 'ETH-USD');
    expect(leaf).to.have.property('value', treeData['ETH-USD']);

    expect(fcds[0]).to.have.property('value', '9.99e-16');
  });
});
