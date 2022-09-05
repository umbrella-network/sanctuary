import 'reflect-metadata';
import { Container } from 'inversify';
import sinon, { createStubInstance, SinonStubbedInstance } from 'sinon';
import { expect } from 'chai';

import BlockSynchronizer from '../../src/services/BlockSynchronizer';
import { randomBlocks, chainAddress } from '../fixtures/inputForBlockModel';
import { ChainInstanceResolver } from '../../src/services/ChainInstanceResolver';
import LeavesSynchronizer from '../../src/services/LeavesSynchronizer';
import RevertedBlockResolver from '../../src/services/RevertedBlockResolver';
import { BlockchainRepository } from '../../src/repositories/BlockchainRepository';
import { ChainContractRepository } from '../../src/repositories/ChainContractRepository';
import { getTestContainer } from '../helpers/getTestContainer';
import { ChainContract } from '../../src/contracts/ChainContract';
import { arbitraryBlockFromChain } from '../fixtures/arbitraryBlockFromChain';
import ChainInstance from '../../src/models/ChainInstance';
import { BigNumber, ethers, Wallet } from 'ethers';
import Block, { IBlock } from '../../src/models/Block';
import { BlockStatus } from '@umb-network/toolbox/dist/types/BlockStatuses';
import { loadTestEnv } from '../helpers';
import { setupDatabase, teardownDatabase } from '../helpers/databaseHelpers';
import { StubbedInstance } from 'ts-sinon';
import { BlockchainSettings } from '../../src/types/Settings';
import BlockChainData, { IBlockChainData } from '../../src/models/BlockChainData';
import { blockChainDataFactory } from '../mocks/factories/blockChainDataFactory';

describe('BlockSynchronizer', () => {
  before(async () => {
    loadTestEnv();
    await setupDatabase();

    Promise.all([
      await Block.deleteMany(),
      await BlockChainData.deleteMany(),

      await ChainInstance.findOneAndUpdate(
        { address: chainAddress },
        {
          address: chainAddress,
          blocksCountOffset: 0,
          anchor: 9,
          chainId: 'bsc',
        },
        {
          new: true,
          upsert: true,
        }
      ),
    ]);
  });

  beforeEach(async () => {
    await Promise.all(
      randomBlocks.map((block) =>
        Promise.all([
          Block.create(block),
          BlockChainData.create(
            blockChainDataFactory.build({ _id: `block::bsc::${block.blockId}`, blockId: block.blockId })
          ),
        ])
      )
    );
  });

  afterEach(async () => {
    await Block.deleteMany({});
    await BlockChainData.deleteMany({});
    sinon.restore();
  });

  after(async () => {
    await teardownDatabase();
  });

  let container: Container;
  let blockSynchronizer: BlockSynchronizer;
  let wallet: Wallet;
  let chainInstanceResolver: SinonStubbedInstance<ChainInstanceResolver>;
  let leavesSynchronizer: SinonStubbedInstance<LeavesSynchronizer>;
  let revertedBlockResolver: SinonStubbedInstance<RevertedBlockResolver>;
  let blockchainRepository: SinonStubbedInstance<BlockchainRepository>;
  let chainContract: SinonStubbedInstance<ChainContract>;
  let chainContractRepository: SinonStubbedInstance<ChainContractRepository>;
  let provider: StubbedInstance<ethers.providers.Provider>;

  describe('#apply', async () => {
    const resolveChainStatus = async (blockNumber: BigNumber, lastBlockId = 10, nextBlockId = 10) =>
      chainContract.resolveStatus.resolves([
        chainAddress,
        {
          blockNumber,
          timePadding: 100,
          lastBlockId,
          nextBlockId,
          nextLeader: '0x111',
          validators: ['0x111'],
          locations: ['abc'],
          lastDataTimestamp: 162345,
          powers: [BigNumber.from(333)],
          staked: BigNumber.from(222),
          minSignatures: 1,
        },
      ]);

    beforeEach(async () => {
      container = getTestContainer();
      chainInstanceResolver = createStubInstance(ChainInstanceResolver);
      leavesSynchronizer = createStubInstance(LeavesSynchronizer);
      revertedBlockResolver = createStubInstance(RevertedBlockResolver);
      blockchainRepository = createStubInstance(BlockchainRepository);
      chainContract = createStubInstance(ChainContract);
      chainContractRepository = createStubInstance(ChainContractRepository);
      provider = createStubInstance(ethers.providers.Provider);
      wallet = Wallet.createRandom();

      revertedBlockResolver.apply.resolves(0);
      chainContract.resolveBlockData.resolves({
        ...arbitraryBlockFromChain,
        root: '0xd4dd03cde5bf7478f1cce81433ef917cdbd235811769bc3495ab6ab49aada5a6',
      });

      chainContractRepository.get.returns(<ChainContract>(<unknown>chainContract));

      blockchainRepository.get.returns({
        chainId: 'bsc',
        isHomeChain: false,
        wallet,
        getProvider: sinon.spy(),
        getLastNonce: sinon.spy(),
        getBlockNumber: sinon.spy(),
        balanceOf: sinon.spy(),
        getContractRegistryAddress: () => 'CONTRACT_REGISTRY_ADDRESS',
        settings: {} as BlockchainSettings,
        provider: provider,
      });

      chainContractRepository.get.returns(<ChainContract>(<unknown>chainContract));

      container.bind(ChainInstanceResolver).toConstantValue(<ChainInstanceResolver>(<unknown>chainInstanceResolver));
      container.bind(LeavesSynchronizer).toConstantValue(<LeavesSynchronizer>(<unknown>leavesSynchronizer));
      container.bind(RevertedBlockResolver).toConstantValue(revertedBlockResolver);
      container.bind(BlockchainRepository).toConstantValue(<BlockchainRepository>(<unknown>blockchainRepository));
      container
        .bind(ChainContractRepository)
        .toConstantValue(<ChainContractRepository>(<unknown>chainContractRepository));

      blockSynchronizer = container.get(BlockSynchronizer);
    });

    it('reverts block when detect invalid root', async () => {
      chainContract.resolveBlockData.resolves({
        ...arbitraryBlockFromChain,
        root: '0xd4dd03cde5bf7478f1cce81433ef917cdbd235811769bc3495ab6ab49aada5a6',
      });

      await resolveChainStatus(BigNumber.from(11)); // new blocks

      const blocksBefore: IBlock[] = await Block.find({});
      const blocksChainDataBefore: IBlockChainData[] = await BlockChainData.find({});
      expect(blocksBefore.length).to.be.equal(3);
      expect(blocksChainDataBefore.length).to.be.equal(3);
      await blockSynchronizer.apply();

      const blocks: IBlock[] = await Block.find({});
      const blocksChainData: IBlockChainData[] = await BlockChainData.find({});
      expect(blocks.length).to.be.equal(2);
      expect(blocksChainData.length).to.be.equal(2);
    });

    it('finalizes completed blocks on successful synchronization', async () => {
      chainContract.resolveBlockData.resolves({
        ...arbitraryBlockFromChain,
        root: '0xd4dd03cde5bf7478f1cce81433ef917cdbd235811769bc3495ab6ab49aada5a6',
      });

      await resolveChainStatus(BigNumber.from(11)); // new blocks
      leavesSynchronizer.apply.resolves(true);

      await blockSynchronizer.apply();
      const blocks: IBlock[] = await Block.find({ status: BlockStatus.Finalized });

      expect(blocks.length).to.be.equal(2);
    });

    it('fails completed blocks on failed synchronization', async () => {
      chainContract.resolveBlockData.resolves({
        ...arbitraryBlockFromChain,
        root: '0xd4dd03cde5bf7478f1cce81433ef917cdbd235811769bc3495ab6ab49aada5a6',
      });

      await resolveChainStatus(BigNumber.from(11)); // new blocks
      leavesSynchronizer.apply.resolves(false);

      await blockSynchronizer.apply();
      const finalized: IBlock[] = await Block.find({ status: BlockStatus.Finalized });
      const failed: IBlock[] = await Block.find({ status: BlockStatus.Failed });

      expect(finalized.length).to.be.equal(1);
      expect(failed.length).to.be.equal(1);
    });

    it('retries on last block', async () => {
      chainContract.resolveBlockData.resolves({
        ...arbitraryBlockFromChain,
        root: '0xd4dd03cde5bf7478f1cce81433ef917cdbd235811769bc3495ab6ab49aada5a6',
      });

      await resolveChainStatus(BigNumber.from(11), 2, 3); // new blocks
      leavesSynchronizer.apply.resolves(null);

      await blockSynchronizer.apply();
      const finalized: IBlock[] = await Block.find({ status: BlockStatus.Finalized });
      const failed: IBlock[] = await Block.find({ status: BlockStatus.Failed });
      const completed: IBlock[] = await Block.find({ status: BlockStatus.Completed });

      expect(finalized.length).to.be.equal(1);
      expect(failed.length).to.be.equal(0);
      expect(completed.length).to.be.equal(1);
    });
  });
});
