import 'reflect-metadata';
import { getTestContainer } from '../helpers/getTestContainer';
import { Container } from 'inversify';
import { ForeignChainReplicator } from '../../src/services/ForeignChainReplicator';
import sinon, { createStubInstance, SinonStub } from 'sinon';
import {
  AvalancheBlockReplicator,
  EthereumBlockReplicator,
  PolygonBlockReplicator,
} from '../../src/services/foreign-chain';
import { ReplicationStatus } from '../../src/services/foreign-chain/ForeignBlockReplicator';
import ForeignBlock, { IForeignBlock } from '../../src/models/ForeignBlock';
import { StubbedInstance, stubConstructor, stubObject } from 'ts-sinon';
import { ForeignBlockFactory } from '../../src/factories/ForeignBlockFactory';
import { ForeignChainStatus } from '../../src/types/ForeignChainStatus';
import Block, { IBlock } from '../../src/models/Block';
import { expect } from 'chai';
import { foreignBlockFactory as mockForeignBlockFactory } from '../mocks/factories/foreignBlockFactory';
import { ForeignChainsIds, TForeignChainsIds } from '../../src/types/ChainsIds';
import { BlockchainRepository } from '../../src/repositories/BlockchainRepository';
import { ethers, Wallet } from 'ethers';
import { BlockchainSettings } from '../../src/types/Settings';
import { parseEther } from 'ethers/lib/utils';

describe('ForeignChainReplicator', () => {
  let container: Container;
  let instance: ForeignChainReplicator;
  const subject = async (foreignChainId: TForeignChainsIds) => instance.apply({ foreignChainId });
  let foreignBlockFactory: StubbedInstance<ForeignBlockFactory>;
  let avalancheBlockReplicator: StubbedInstance<AvalancheBlockReplicator>;
  let ethereumBlockReplicator: StubbedInstance<EthereumBlockReplicator>;
  let polygonBlockReplicator: StubbedInstance<PolygonBlockReplicator>;
  let foreignChainStatus: SinonStub;
  let wallet: Wallet;
  let replicationStatus: ReplicationStatus;
  let block: StubbedInstance<IBlock>;
  let foreignBlock: StubbedInstance<IForeignBlock>;
  let blockchainRepository: StubbedInstance<BlockchainRepository>;
  let provider: StubbedInstance<ethers.providers.Provider>;

  after(() => {
    sinon.restore();
  });

  describe('#apply', async () => {
    describe('when balance is enough', () => {
      before(async () => {
        container = getTestContainer();
        foreignBlockFactory = stubConstructor(ForeignBlockFactory);
        avalancheBlockReplicator = stubConstructor(AvalancheBlockReplicator);
        ethereumBlockReplicator = stubConstructor(EthereumBlockReplicator);
        polygonBlockReplicator = stubConstructor(PolygonBlockReplicator);
        blockchainRepository = createStubInstance(BlockchainRepository);
        provider = createStubInstance(ethers.providers.Provider);
        wallet = Wallet.createRandom();
        sinon.stub(wallet, 'getBalance').resolves(parseEther('1'));

        blockchainRepository.get.returns({
          chainId: 'ethereum',
          isHomeChain: false,
          wallet,
          getProvider: sinon.spy(),
          getLastNonce: sinon.spy(),
          getBlockNumber: sinon.spy(),
          balanceOf: sinon.spy(),
          getContractRegistryAddress: sinon.spy(),
          settings: {} as BlockchainSettings,
          provider: provider,
        });

        container.bind(AvalancheBlockReplicator).toConstantValue(avalancheBlockReplicator);
        container.bind(EthereumBlockReplicator).toConstantValue(ethereumBlockReplicator);
        container.bind(PolygonBlockReplicator).toConstantValue(polygonBlockReplicator);
        container.bind(ForeignBlockFactory).toConstantValue(foreignBlockFactory);
        container.bind(BlockchainRepository).toConstantValue(<BlockchainRepository>(<unknown>blockchainRepository));

        foreignChainStatus = sinon.stub();
        avalancheBlockReplicator.getStatus.resolves(<ForeignChainStatus>(<unknown>foreignChainStatus));
        ethereumBlockReplicator.getStatus.resolves(<ForeignChainStatus>(<unknown>foreignChainStatus));
        polygonBlockReplicator.getStatus.resolves(<ForeignChainStatus>(<unknown>foreignChainStatus));
        block = stubConstructor(Block);
        avalancheBlockReplicator.resolvePendingBlocks.resolves([block]);
        ethereumBlockReplicator.resolvePendingBlocks.resolves([block]);
        polygonBlockReplicator.resolvePendingBlocks.resolves([block]);
        replicationStatus = { blocks: [block], anchors: [1], fcds: [{ keys: [], values: [] }] };
        avalancheBlockReplicator.replicate.resolves(replicationStatus);
        ethereumBlockReplicator.replicate.resolves(replicationStatus);
        polygonBlockReplicator.replicate.resolves(replicationStatus);

        foreignBlock = stubObject<IForeignBlock>(new ForeignBlock(mockForeignBlockFactory.attributes()));
        foreignBlock.save.resolves();
        foreignBlockFactory.fromBlock.returns(foreignBlock);

        instance = container.get(ForeignChainReplicator);
      });

      after(() => {
        sinon.restore();
      });

      ForeignChainsIds.forEach((foreignChainId: TForeignChainsIds) => {
        it(`replicates blocks for ${foreignChainId}`, async () => {
          const result = <IForeignBlock[]>await subject(foreignChainId);
          expect(result.length).to.eq(1);
          expect(result[0]).to.eq(foreignBlock);
        });
      });
    });

    describe('when balance is not enough', () => {
      before(async () => {
        container = getTestContainer();
        foreignBlockFactory = stubConstructor(ForeignBlockFactory);
        avalancheBlockReplicator = stubConstructor(AvalancheBlockReplicator);
        ethereumBlockReplicator = stubConstructor(EthereumBlockReplicator);
        polygonBlockReplicator = stubConstructor(PolygonBlockReplicator);
        blockchainRepository = createStubInstance(BlockchainRepository);
        provider = createStubInstance(ethers.providers.Provider);

        wallet = Wallet.createRandom();
        sinon.stub(wallet, 'getBalance').resolves(parseEther('0.01'));

        blockchainRepository.get.returns({
          chainId: 'ethereum',
          isHomeChain: false,
          wallet,
          getProvider: sinon.spy(),
          getLastNonce: sinon.spy(),
          getBlockNumber: sinon.spy(),
          balanceOf: sinon.spy(),
          getContractRegistryAddress: sinon.spy(),
          settings: {} as BlockchainSettings,
          provider: provider,
        });

        container.bind(AvalancheBlockReplicator).toConstantValue(avalancheBlockReplicator);
        container.bind(EthereumBlockReplicator).toConstantValue(ethereumBlockReplicator);
        container.bind(PolygonBlockReplicator).toConstantValue(polygonBlockReplicator);
        container.bind(ForeignBlockFactory).toConstantValue(foreignBlockFactory);
        container.bind(BlockchainRepository).toConstantValue(<BlockchainRepository>(<unknown>blockchainRepository));

        foreignChainStatus = sinon.stub();
        avalancheBlockReplicator.getStatus.resolves(<ForeignChainStatus>(<unknown>foreignChainStatus));
        ethereumBlockReplicator.getStatus.resolves(<ForeignChainStatus>(<unknown>foreignChainStatus));
        polygonBlockReplicator.getStatus.resolves(<ForeignChainStatus>(<unknown>foreignChainStatus));
        block = stubConstructor(Block);
        avalancheBlockReplicator.resolvePendingBlocks.resolves([block]);
        ethereumBlockReplicator.resolvePendingBlocks.resolves([block]);
        polygonBlockReplicator.resolvePendingBlocks.resolves([block]);
        replicationStatus = { blocks: [block], anchors: [1], fcds: [{ keys: [], values: [] }] };
        avalancheBlockReplicator.replicate.resolves(replicationStatus);
        ethereumBlockReplicator.replicate.resolves(replicationStatus);
        polygonBlockReplicator.replicate.resolves(replicationStatus);

        foreignBlock = stubObject<IForeignBlock>(new ForeignBlock(mockForeignBlockFactory.attributes()));
        foreignBlock.save.resolves();
        foreignBlockFactory.fromBlock.returns(foreignBlock);

        instance = container.get(ForeignChainReplicator);
      });

      after(() => {
        sinon.restore();
      });

      ForeignChainsIds.forEach((foreignChainId: TForeignChainsIds) => {
        it(`should not replicates blocks for ${foreignChainId}`, async () => {
          const result = <IForeignBlock[]>await subject(foreignChainId);
          expect(result).to.eq(undefined);
        });
      });
    });
  });
});
