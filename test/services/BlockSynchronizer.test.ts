/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import {Container} from 'inversify';
import {Logger} from 'winston';
import {mockedLogger} from '../mocks/logger';
import ChainContract from '../../src/contracts/ChainContract';
import LeavesSynchronizer from '../../src/services/LeavesSynchronizer';
import BlockSynchronizer from '../../src/services/BlockSynchronizer';
import sinon from 'sinon';
import {BigNumber} from 'ethers';
import mongoose from 'mongoose';
import {loadTestEnv} from '../helpers';
import Block from '../../src/models/Block';
import ChainInstance from '../../src/models/ChainInstance';
import {expect} from 'chai';
import {arbitraryBlockFromChain} from '../fixtures/arbitraryBlockFromChain';
import {ChainInstanceResolver} from '../../src/services/ChainInstanceResolver';

describe('BlockSynchronizer', () => {
  let container: Container;
  let mockedChainContract: sinon.SinonStubbedInstance<ChainContract>;
  let mockedChainInstanceResolver: sinon.SinonStubbedInstance<ChainInstanceResolver>;
  let mockedLeavesSynchronizer: sinon.SinonStubbedInstance<LeavesSynchronizer>;
  let blockSynchronizer: BlockSynchronizer;

  before(async () => {
    const config = loadTestEnv();
    mongoose.set('useFindAndModify', false);
    await mongoose.connect(config.MONGODB_URL, {useNewUrlParser: true, useUnifiedTopology: true});

    await ChainInstance.findOneAndUpdate({address: '0x321'}, {
      address: '0x321',
      blocksCountOffset: 0,
      dataTimestamp: new Date()
    },
    {
      new: true,
      upsert: true,
    });
  });

  beforeEach(async () => {
    container = new Container({autoBindInjectable: true});

    // Mocking dependencies and adding them to the container
    mockedChainContract = sinon.createStubInstance(ChainContract);
    mockedChainInstanceResolver = sinon.createStubInstance(ChainInstanceResolver);
    mockedLeavesSynchronizer = sinon.createStubInstance(LeavesSynchronizer);
    container.bind<Logger>('Logger').toConstantValue(mockedLogger);
    container.bind(ChainContract).toConstantValue(mockedChainContract as unknown as ChainContract);
    container.bind(ChainInstanceResolver).toConstantValue(mockedChainInstanceResolver as unknown as ChainInstanceResolver);
    container.bind(LeavesSynchronizer).toConstantValue(mockedLeavesSynchronizer as unknown as LeavesSynchronizer);

    // Adding BlockSynchronizer to the container
    container.bind(BlockSynchronizer).toSelf();

    blockSynchronizer = container.get(BlockSynchronizer);

    mockedChainContract.resolveContract.resolves(<ChainContract><unknown>mockedChainContract);

    // Clearing DB before each test
    await Block.deleteMany({});

    mockedChainContract.resolveStatus.resolves([
      '0x321',
      {
        blockNumber: BigNumber.from(1),
        timePadding: 100,
        lastBlockId: 10,
        nextBlockId: 10,
        nextLeader: '0x111',
        validators: ['0x111'],
        locations: ['abc'],
        lastDataTimestamp: 162345,
        powers: [BigNumber.from(333)],
        staked: BigNumber.from(222),
      },
    ]);
  });

  after(async () => {
    await Block.deleteMany({});
    await ChainInstance.deleteMany({});
    await mongoose.connection.close();
  });

  it('marks ten new blocks as "new" and saves to DB', async () => {
    mockedChainContract.resolveBlockData.resolves(arbitraryBlockFromChain);
    mockedChainInstanceResolver.apply.resolves(new ChainInstance({address: '0x321'}));

    await blockSynchronizer.apply();

    let blocks: any[] = await Block.find({});

    expect(blocks.length).to.be.equal(11);

    blocks
      .sort((a, b) => a.blockId - b.blockId)
      .forEach((block, i) => {
        expect(block).to.have.property('status', 'new');
        expect(block).to.have.property('blockId', i);
        expect(block).to.have.property('_id', `block::${block.blockId}`);
      });

    mockedLeavesSynchronizer.apply.resolves(true);
    await blockSynchronizer.apply();

    blocks = await Block.find({});

    expect(blocks.length).to.be.equal(11);

    blocks
      .sort((a, b) => a.blockId - b.blockId)
      .forEach((block, i) => {
        expect(block).to.have.property('status', 'completed');
        expect(block).to.have.property('blockId', i);
        expect(block).to.have.property('_id', `block::${block.blockId}`);
      });

    await blockSynchronizer.apply();

    expect(mockedLeavesSynchronizer.apply.callCount).to.be.equal(11);

    blocks = await Block.find({});

    expect(blocks.length).to.be.equal(11);

    blocks
      .sort((a, b) => a.blockId - b.blockId)
      .forEach((block, i) => {
        expect(block).to.have.property('status', 'finalized');
        expect(block).to.have.property('blockId', i);
        expect(block).to.have.property('_id', `block::${block.blockId}`);
      });
  });

  it('marks completed blocks as "failed" if leaves synchronization finished unsuccessfully', async () => {
    mockedLeavesSynchronizer.apply.resolves(false);
    mockedChainContract.resolveBlockData.resolves(arbitraryBlockFromChain);
    mockedChainInstanceResolver.apply.resolves(new ChainInstance({address: '0x321'}));

    await blockSynchronizer.apply();
    await blockSynchronizer.apply();
    await blockSynchronizer.apply();

    expect(mockedLeavesSynchronizer.apply.callCount).to.be.equal(11);

    const blocks: any[] = await Block.find({});

    expect(blocks.length).to.be.equal(11);

    blocks
      .sort((a, b) => a.blockId - b.blockId)
      .forEach((block, i) => {
        expect(block).to.have.property('status', 'failed', `block ${i}`);
        expect(block).to.have.property('blockId', i);
        expect(block).to.have.property('_id', `block::${block.blockId}`);
      });
  });
});
