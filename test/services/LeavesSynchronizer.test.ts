/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import { Container } from 'inversify';
import LeavesSynchronizer from '../../src/services/LeavesSynchronizer';
import StakingBankContract from '../../src/contracts/StakingBankContract';
import sinon from 'sinon';
import { BigNumber, ethers } from 'ethers';
import Block from '../../src/models/Block';
import Leaf from '../../src/models/Leaf';
import moxios from 'moxios';
import { LeafValueCoder } from '@umb-network/toolbox';
import { expect } from 'chai';
import { inputForBlockChainDataModel, inputForBlockModel } from '../fixtures/inputForBlockModel';
import { ChainContract } from '../../src/contracts/ChainContract';
import FCD from '../../src/models/FCD';
import { ChainStatus } from '../../src/types/ChainStatus';
import { Validator } from '../../src/types/Validator';
import { BlockFromPegasus } from '../../src/types/blocks';
import settings from '../../src/config/settings';
import { setupDatabase, teardownDatabase } from '../helpers/databaseHelpers';
import { getTestContainer } from '../helpers/getTestContainer';
import { loadTestEnv } from '../helpers';
import { ChainContractRepository } from '../../src/repositories/ChainContractRepository';
import BlockChainData from '../../src/models/BlockChainData';

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
  let chainContract: sinon.SinonStubbedInstance<ChainContract>;
  let chainContractRepository: sinon.SinonStubbedInstance<ChainContractRepository>;
  let validatorRegistryContract: sinon.SinonStubbedInstance<StakingBankContract>;
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
    loadTestEnv();
    await setupDatabase();
  });

  beforeEach(async () => {
    moxios.uninstall();
    settings.app.feedsOnChain = 'test/fixtures/feeds-example.yaml';

    container = getTestContainer();

    // Mocking dependencies and adding them to the container
    chainContract = sinon.createStubInstance(ChainContract);
    validatorRegistryContract = sinon.createStubInstance(StakingBankContract);
    chainContractRepository = sinon.createStubInstance(ChainContractRepository);

    chainContractRepository.get.returns(<ChainContract>(<unknown>chainContract));
    chainContract.resolveValidators.returns(resolveValidators(chainStatus));
    chainContract.resolveFCDs.resolves([[BigNumber.from(1)], [BigNumber.from('17005632')]] as any);

    container.bind(StakingBankContract).toConstantValue((validatorRegistryContract as unknown) as StakingBankContract);
    container.rebind('Settings').toConstantValue(settings);
    container.bind(ChainContract).toConstantValue((chainContract as unknown) as ChainContract);

    container
      .bind(ChainContractRepository)
      .toConstantValue((chainContractRepository as unknown) as ChainContractRepository);

    leavesSynchronizer = container.get(LeavesSynchronizer);

    // Clearing DB before each test
    await Block.deleteMany({});
    await BlockChainData.deleteMany({});
    await Leaf.deleteMany({});
  });

  after(async () => {
    moxios.uninstall();

    await Block.deleteMany({});
    await BlockChainData.deleteMany({});
    await Leaf.deleteMany({});
    await FCD.deleteMany({});

    await teardownDatabase();
  });

  it('returns "false/null" if root hashes do not match', async () => {
    const block = await Block.create({
      ...inputForBlockModel,
      root: ethers.utils.keccak256('0x1234'), // overwrite inputForBlockModel with a wrong root hash
    });

    await BlockChainData.create(inputForBlockChainDataModel);

    moxios.install();
    moxios.stubRequest(/http:\/\/validator-address\/blocks\/blockId\/.+/, {
      status: 200,
      response: {
        data: {
          ...blockFromPegasus,
          data: {
            'ETH-USD': '0x' + LeafValueCoder.encode(10, 'ETH-USD').toString('hex'),
          },
        },
      },
    });

    const oldStatus = {
      ...chainStatus,
      lastBlockId: chainStatus.lastBlockId - 1,
      nextBlockId: chainStatus.nextBlockId - 1,
    };

    expect(await leavesSynchronizer.apply(chainStatus, block._id)).to.equal(null, 'null for current block');
    expect(await leavesSynchronizer.apply(oldStatus, block._id)).to.equal(false, 'false for old blocks');
  });

  it('returns "true" if root hashes match', async () => {
    const block = await Block.create(inputForBlockModel);
    await BlockChainData.create(inputForBlockChainDataModel);
    chainContract.resolveValidators.returns(resolveValidators(chainStatus));
    chainContract.resolveFCDs.resolves([[BigNumber.from(1)], [17005632]]);
    moxios.install();

    moxios.stubRequest(/http:\/\/validator-address\/blocks\/blockId\/.+/, {
      status: 200,
      response: {
        data: [blockFromPegasus],
      },
    });

    const result = await leavesSynchronizer.apply(chainStatus, block._id);
    expect(result).to.be.true;
  });

  it('saves leaves correctly if root hashes match', async () => {
    const block = await Block.create(inputForBlockModel);
    await BlockChainData.create(inputForBlockChainDataModel);

    chainContract.resolveValidators.returns(resolveValidators(chainStatus));
    // chainContract.resolveFCDs.resolves([[BigNumber.from(999)], [BigNumber.from('17005632')]] as any);

    const treeData = {
      'ETH-USD': '0x' + LeafValueCoder.encode(100, 'ETH-USD').toString('hex'),
    };

    moxios.install();
    moxios.stubRequest(/http:\/\/validator-address\/blocks\/blockId\/.+/, {
      status: 200,
      response: {
        data: [blockFromPegasus],
      },
    });

    await leavesSynchronizer.apply(chainStatus, block._id);

    const leaves = await Leaf.find({});

    expect(leaves.length).to.be.equal(1, 'number of created leaves is not correct');

    const [leaf] = leaves;

    expect(leaf).to.have.property('_id', 'block::1::leaf::ETH-USD');
    expect(leaf).to.have.property('blockId', 1);
    expect(leaf).to.have.property('key', 'ETH-USD');
    expect(leaf).to.have.property('value', treeData['ETH-USD']);
  });
});
