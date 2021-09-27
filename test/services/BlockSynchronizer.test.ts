import 'reflect-metadata';
import { Container } from 'inversify';
import BlockSynchronizer from '../../src/services/BlockSynchronizer';
import { ChainInstanceResolver } from '../../src/services/ChainInstanceResolver';
import LeavesSynchronizer from '../../src/services/LeavesSynchronizer';
import RevertedBlockResolver from '../../src/services/RevertedBlockResolver';
import { BlockchainRepository } from '../../src/repositories/BlockchainRepository';
import { ChainContractRepository } from '../../src/repositories/ChainContractRepository';
import sinon, { createStubInstance, SinonStubbedInstance } from 'sinon';
import { getTestContainer } from '../helpers/getTestContainer';
import { ChainContract } from '../../src/contracts/ChainContract';
import { arbitraryBlockFromChain } from '../fixtures/arbitraryBlockFromChain';
import { Blockchain } from '../../src/lib/Blockchain';

describe('BlockSynchronizer', () => {
  describe('#apply', async () => {
    let container: Container;
    let instance: BlockSynchronizer;
    const subject = async () => await instance.apply();
    let chainInstanceResolver: SinonStubbedInstance<ChainInstanceResolver>;
    let leavesSynchronizer: SinonStubbedInstance<LeavesSynchronizer>;
    let revertedBlockResolver: SinonStubbedInstance<RevertedBlockResolver>;
    let blockchainRepository: SinonStubbedInstance<BlockchainRepository>;
    let chainContract: SinonStubbedInstance<ChainContract>;
    let chainContractRepository: SinonStubbedInstance<ChainContractRepository>;

    before(async () => {
      container = getTestContainer();
      chainInstanceResolver = createStubInstance(ChainInstanceResolver);
      leavesSynchronizer = createStubInstance(LeavesSynchronizer);
      revertedBlockResolver = createStubInstance(RevertedBlockResolver);
      blockchainRepository = createStubInstance(BlockchainRepository);
      chainContract = createStubInstance(ChainContract);
      chainContractRepository = createStubInstance(ChainContractRepository);

      chainContractRepository.get.returns(<ChainContract><unknown> chainContract);
      revertedBlockResolver.apply.resolves(0);

      chainContract.resolveBlockData.resolves({
        ...arbitraryBlockFromChain,
        root: '0xd4dd03cde5bf7478f1cce81433ef917cdbd235811769bc3495ab6ab49aada5a6'
      });

      const blockchain = createStubInstance(Blockchain);
      blockchain.getContractRegistryAddress.returns('CONTRACT_REGISTRY_ADDRESS');
      blockchainRepository.get.returns(blockchain);
      chainContractRepository.get.returns(<ChainContract><unknown> chainContract);

      container.bind(ChainInstanceResolver).toConstantValue(<ChainInstanceResolver><unknown> chainInstanceResolver);
      container.bind(LeavesSynchronizer).toConstantValue(<LeavesSynchronizer><unknown> leavesSynchronizer);
      container.bind(RevertedBlockResolver).toConstantValue(revertedBlockResolver);
      container.bind(BlockchainRepository).toConstantValue(<BlockchainRepository><unknown> blockchainRepository);

      container
        .bind(ChainContractRepository)
        .toConstantValue(<ChainContractRepository><unknown> chainContractRepository);

      instance = container.get(BlockSynchronizer);
    });

    after(async () => {
      sinon.restore();
    });

    it('synchronizes blocks', async () => {
      // const result = await subject();

    });
  });
});



// /* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any */
// import 'reflect-metadata';
// import {Container} from 'inversify';
// import {Logger} from 'winston';
// import {mockedLogger} from '../mocks/logger';
// import ChainContract from '../../src/contracts/ChainContract';
// import LeavesSynchronizer from '../../src/services/LeavesSynchronizer';
// import BlockSynchronizer from '../../src/services/BlockSynchronizer';
// import sinon from 'sinon';
// import {BigNumber} from 'ethers';
// import mongoose from 'mongoose';
// import {loadTestEnv} from '../helpers';
// import Block from '../../src/models/Block';
// import ChainInstance from '../../src/models/ChainInstance';
// import {expect} from 'chai';
// import {arbitraryBlockFromChain} from '../fixtures/arbitraryBlockFromChain';
// import {ChainInstanceResolver} from '../../src/services/ChainInstanceResolver';
// import Blockchain from '../../src/lib/Blockchain';
// import settings from '../../src/config/settings';
// import {randomBlocks} from '../fixtures/inputForBlockModel';
// import {BlockStatus} from '../../src/types/blocks';
//
// describe('BlockSynchronizer', () => {
//   let container: Container;
//   let mockedChainContract: sinon.SinonStubbedInstance<ChainContract>;
//   let mockedChainInstanceResolver: sinon.SinonStubbedInstance<ChainInstanceResolver>;
//   let mockedLeavesSynchronizer: sinon.SinonStubbedInstance<LeavesSynchronizer>;
//   let mockedBlockchain: sinon.SinonStubbedInstance<Blockchain>;
//   let blockSynchronizer: BlockSynchronizer;
//   const chainAddress = '0xA6f3317483048B095691b8a8CE0C57077a378689';
//
//   const resolveChainStatus = async (blockNumber: BigNumber, lastBlockId = 10, nextBlockId = 10) => await mockedChainContract.resolveStatus.resolves([
//     chainAddress,
//     {
//       blockNumber,
//       timePadding: 100,
//       lastBlockId,
//       nextBlockId,
//       nextLeader: '0x111',
//       validators: ['0x111'],
//       locations: ['abc'],
//       lastDataTimestamp: 162345,
//       powers: [BigNumber.from(333)],
//       staked: BigNumber.from(222),
//       minSignatures: 1,
//     },
//   ]);
//
//   before(async () => {
//     const config = loadTestEnv();
//     mongoose.set('useFindAndModify', false);
//     await mongoose.connect(config.MONGODB_URL, {useNewUrlParser: true, useUnifiedTopology: true});
//
//     await ChainInstance.findOneAndUpdate({address: chainAddress}, {
//       address: chainAddress,
//       blocksCountOffset: 0,
//       anchor: 9
//     },
//     {
//       new: true,
//       upsert: true,
//     });
//   });
//
//   beforeEach(async () => {
//     container = new Container({autoBindInjectable: true});
//
//     // Mocking dependencies and adding them to the container
//     mockedBlockchain = sinon.createStubInstance(Blockchain);
//     mockedChainContract = sinon.createStubInstance(ChainContract);
//     mockedChainInstanceResolver = sinon.createStubInstance(ChainInstanceResolver);
//     mockedLeavesSynchronizer = sinon.createStubInstance(LeavesSynchronizer);
//
//     container.bind<Logger>('Logger').toConstantValue(mockedLogger);
//     container.bind('Settings').toConstantValue(settings);
//     container.bind(Blockchain).toConstantValue(mockedBlockchain);
//     container.bind(ChainContract).toConstantValue(mockedChainContract as unknown as ChainContract);
//     container.bind(ChainInstanceResolver).toConstantValue(mockedChainInstanceResolver as unknown as ChainInstanceResolver);
//     container.bind(LeavesSynchronizer).toConstantValue(mockedLeavesSynchronizer as unknown as LeavesSynchronizer);
//
//     // Adding BlockSynchronizer to the container
//     container.bind(BlockSynchronizer).toSelf();
//
//     blockSynchronizer = container.get(BlockSynchronizer);
//
//     mockedChainContract.resolveContract.resolves(<ChainContract><unknown>mockedChainContract);
//
//     // Clearing DB before each test
//     await Block.deleteMany({});
//
//     await Promise.all(randomBlocks.map(async (block) => {
//       return Block.findOneAndUpdate({_id: block._id}, block, {new: true, upsert: true});
//     }));
//   });
//
//   after(async () => {
//     await Block.deleteMany({});
//     await ChainInstance.deleteMany({});
//     await mongoose.connection.close();
//   });
//
//   it('it will revert block when detect invalid root', async () => {
//     mockedChainContract.resolveBlockData.resolves({
//       ...arbitraryBlockFromChain,
//       root: '0xd4dd03cde5bf7478f1cce81433ef917cdbd235811769bc3495ab6ab49aada5a6'
//     });
//     mockedChainInstanceResolver.byBlockId.resolves([new ChainInstance({address: chainAddress})]);
//     await resolveChainStatus(BigNumber.from(11)); // new blocks
//
//     const blocksBefore: any[] = await Block.find({});
//     expect(blocksBefore.length).to.be.equal(3);
//
//     await blockSynchronizer.apply();
//
//     const blocks: any[] = await Block.find({});
//     expect(blocks.length).to.be.equal(2);
//   });
//
//   it('it will finalize completed blocks on successful synchronization', async () => {
//     mockedChainContract.resolveBlockData.resolves({
//       ...arbitraryBlockFromChain,
//       root: '0xd4dd03cde5bf7478f1cce81433ef917cdbd235811769bc3495ab6ab49aada5a6'
//     });
//     mockedChainInstanceResolver.byBlockId.resolves([new ChainInstance({address: chainAddress})]);
//     await resolveChainStatus(BigNumber.from(11)); // new blocks
//     mockedLeavesSynchronizer.apply.resolves(true);
//
//     await blockSynchronizer.apply();
//     const blocks: any[] = await Block.find({status: BlockStatus.Finalized});
//
//     expect(blocks.length).to.be.equal(2);
//   });
//
//   it('it will fail completed blocks on failed synchronization', async () => {
//     mockedChainContract.resolveBlockData.resolves({
//       ...arbitraryBlockFromChain,
//       root: '0xd4dd03cde5bf7478f1cce81433ef917cdbd235811769bc3495ab6ab49aada5a6'
//     });
//     mockedChainInstanceResolver.byBlockId.resolves([new ChainInstance({address: chainAddress})]);
//     await resolveChainStatus(BigNumber.from(11)); // new blocks
//     mockedLeavesSynchronizer.apply.resolves(false);
//
//     await blockSynchronizer.apply();
//     const finalized: any[] = await Block.find({status: BlockStatus.Finalized});
//     const failed: any[] = await Block.find({status: BlockStatus.Failed});
//
//     expect(finalized.length).to.be.equal(1);
//     expect(failed.length).to.be.equal(1);
//   });
//
//
//   it('it will retry on last block', async () => {
//     mockedChainContract.resolveBlockData.resolves({
//       ...arbitraryBlockFromChain,
//       root: '0xd4dd03cde5bf7478f1cce81433ef917cdbd235811769bc3495ab6ab49aada5a6'
//     });
//     mockedChainInstanceResolver.byBlockId.resolves([new ChainInstance({address: chainAddress})]);
//     await resolveChainStatus(BigNumber.from(11), 2, 3); // new blocks
//     mockedLeavesSynchronizer.apply.resolves(null);
//
//     await blockSynchronizer.apply();
//     const finalized: any[] = await Block.find({status: BlockStatus.Finalized});
//     const failed: any[] = await Block.find({status: BlockStatus.Failed});
//     const completed: any[] = await Block.find({status: BlockStatus.Completed});
//
//     expect(finalized.length).to.be.equal(1);
//     expect(failed.length).to.be.equal(0);
//     expect(completed.length).to.be.equal(1);
//   });
// });
