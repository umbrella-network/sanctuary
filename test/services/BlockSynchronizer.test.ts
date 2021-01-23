/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import { Container } from 'inversify';
import { Logger } from 'winston';
import { mockedLogger } from '../mocks/logger';
import ChainContract from '../../src/contracts/ChainContract';
import LeavesSynchronizer from '../../src/services/LeavesSynchronizer';
import BlockSynchronizer from '../../src/services/BlockSynchronizer';
import sinon from 'sinon';
import { BigNumber, ethers } from 'ethers';
import mongoose from 'mongoose';
import { loadTestEnv } from '../helpers';
import Block from '../../src/models/Block';
import chai from 'chai';

describe('BlockSynchronizer', () => {
  let container: Container;
  let mockedChainContract: sinon.SinonStubbedInstance<ChainContract>;
  let mockedLeavesSynchronizer: sinon.SinonStubbedInstance<LeavesSynchronizer>;
  let blockSynchronizer: BlockSynchronizer;

  before(async () => {
    const config = loadTestEnv();
    mongoose.set('useFindAndModify', false);
    await mongoose.connect(config.MONGODB_URL, { useNewUrlParser: true, useUnifiedTopology: true });
  });

  beforeEach(async () => {
    container = new Container({ autoBindInjectable: true });

    // Mocking dependencies and adding them to the container
    mockedChainContract = sinon.createStubInstance(ChainContract);
    mockedLeavesSynchronizer = sinon.createStubInstance(LeavesSynchronizer);
    container.bind<Logger>('Logger').toConstantValue(mockedLogger);
    container.bind(ChainContract).toConstantValue(mockedChainContract as unknown as ChainContract);
    container.bind(LeavesSynchronizer).toConstantValue(mockedLeavesSynchronizer as unknown as LeavesSynchronizer);

    // Adding BlockSynchronizer to the container
    container.bind(BlockSynchronizer).toSelf();

    blockSynchronizer = container.get(BlockSynchronizer);

    // Clearing DB before each test
    await Block.deleteMany({});
  });

  after(async () => {
    await Block.deleteMany({});
    await mongoose.connection.close();
  });

  it('marks ten new blocks as "new" and saves to DB', async () => {
    mockedChainContract.getBlockHeight.returns(Promise.resolve(BigNumber.from(11)));
    mockedChainContract.blocks.returns({
      timestamp: BigNumber.from(1611359125),
      anchor: BigNumber.from(1024),
    } as any);

    await blockSynchronizer.apply();

    const blocks: any[] = await Block.find({});

    chai.expect(blocks.length).to.be.equal(10);

    blocks.forEach((block, i) => {
      chai.expect(block).to.have.property('status', 'new');
      chai.expect(block).to.have.property('height', i + 1);
      chai.expect(block).to.have.property('_id', `block::${i + 1}`);
    });
  });

  it('marks new blocks as "completed"', async () => {
    mockedChainContract.getBlockHeight.returns(Promise.resolve(BigNumber.from(11)));
    mockedChainContract.blocks.returns({
      timestamp: BigNumber.from(1611359125),
      anchor: BigNumber.from(1024),
      root: ethers.utils.keccak256('0x1234'),
      minter: '0xA405324F4b6EB7Bc76f1964489b3769cfc71445F',
      staked: '1000000000000000000',
      power: '1000000000000000000',
    } as any);
    mockedChainContract.getBlockVoters.returns(Promise.resolve(['0xA405324F4b6EB7Bc76f1964489b3769cfc71445F']));
    mockedChainContract.getBlockVotes.returns(Promise.resolve(BigNumber.from('1000000000000000000')));

    await blockSynchronizer.apply();

    await blockSynchronizer.apply();

    const blocks: any[] = await Block.find({});

    chai.expect(blocks.length).to.be.equal(10);

    blocks.forEach((block, i) => {
      chai.expect(block).to.have.property('status', 'completed');
      chai.expect(block).to.have.property('height', i + 1);
      chai.expect(block).to.have.property('_id', `block::${i + 1}`);
    });
  });

  it('marks completed blocks as "finalized" if leaves synchronization finished successfully', async () => {
    mockedLeavesSynchronizer.apply.returns(Promise.resolve(true));
    mockedChainContract.getBlockHeight.returns(Promise.resolve(BigNumber.from(11)));
    mockedChainContract.blocks.returns({
      timestamp: BigNumber.from(1611359125),
      anchor: BigNumber.from(1024),
      root: ethers.utils.keccak256('0x1234'),
      minter: '0xA405324F4b6EB7Bc76f1964489b3769cfc71445F',
      staked: '1000000000000000000',
      power: '1000000000000000000',
    } as any);
    mockedChainContract.getBlockVoters.returns(Promise.resolve(['0xA405324F4b6EB7Bc76f1964489b3769cfc71445F']));
    mockedChainContract.getBlockVotes.returns(Promise.resolve(BigNumber.from('1000000000000000000')));

    await blockSynchronizer.apply();

    await blockSynchronizer.apply();

    await blockSynchronizer.apply();

    chai.expect(mockedLeavesSynchronizer.apply.callCount).to.be.equal(10);

    const blocks: any[] = await Block.find({});

    chai.expect(blocks.length).to.be.equal(10);

    blocks.forEach((block, i) => {
      chai.expect(block).to.have.property('status', 'finalized');
      chai.expect(block).to.have.property('height', i + 1);
      chai.expect(block).to.have.property('_id', `block::${i + 1}`);
    });
  });

  it('marks completed blocks as "failed" if leaves synchronization finished unsuccessfully', async () => {
    mockedLeavesSynchronizer.apply.returns(Promise.resolve(null));
    mockedChainContract.getBlockHeight.returns(Promise.resolve(BigNumber.from(11)));
    mockedChainContract.blocks.returns({
      timestamp: BigNumber.from(1611359125),
      anchor: BigNumber.from(1024),
      root: ethers.utils.keccak256('0x1234'),
      minter: '0xA405324F4b6EB7Bc76f1964489b3769cfc71445F',
      staked: '1000000000000000000',
      power: '1000000000000000000',
    } as any);
    mockedChainContract.getBlockVoters.returns(Promise.resolve(['0xA405324F4b6EB7Bc76f1964489b3769cfc71445F']));
    mockedChainContract.getBlockVotes.returns(Promise.resolve(BigNumber.from('1000000000000000000')));

    await blockSynchronizer.apply();

    await blockSynchronizer.apply();

    await blockSynchronizer.apply();

    chai.expect(mockedLeavesSynchronizer.apply.callCount).to.be.equal(10);

    const blocks: any[] = await Block.find({});

    chai.expect(blocks.length).to.be.equal(10);

    blocks.forEach((block, i) => {
      chai.expect(block).to.have.property('status', 'failed');
      chai.expect(block).to.have.property('height', i + 1);
      chai.expect(block).to.have.property('_id', `block::${i + 1}`);
    });
  });
});
