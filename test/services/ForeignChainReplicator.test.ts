import 'reflect-metadata';
import { getTestContainer } from '../helpers/getTestContainer';
import { Container } from 'inversify';
import { ForeignChainReplicator } from '../../src/services/ForeignChainReplicator';
import sinon, { createStubInstance, SinonStub } from 'sinon';
import {
  ArbitrumBlockReplicator,
  AvalancheBlockReplicator,
  EthereumBlockReplicator,
  PolygonBlockReplicator,
} from '../../src/services/foreign-chain';
import { ReplicationStatus } from '../../src/services/foreign-chain/ForeignBlockReplicator';
import BlockChainData, { IBlockChainData } from '../../src/models/BlockChainData';
import { StubbedInstance, stubConstructor, stubObject } from 'ts-sinon';
import { BlockChainDataFactory } from '../../src/factories/BlockChainDataFactory';
import { ForeignChainStatus } from '../../src/types/ForeignChainStatus';
import Block, { IBlock } from '../../src/models/Block';
import { expect } from 'chai';
import { blockChainDataFactory as mockBlockChainDataFactory } from '../mocks/factories/blockChainDataFactory';
import { ForeignChainsIds, TForeignChainsIds, NonEvmChainsIds } from '../../src/types/ChainsIds';
import { BlockchainRepository } from '../../src/repositories/BlockchainRepository';
import { ethers, Wallet } from 'ethers';
import { BlockchainSettings } from '../../src/types/Settings';
import { parseEther } from 'ethers/lib/utils';
import { ChainContractRepository } from '../../src/repositories/ChainContractRepository';

describe('ForeignChainReplicator', () => {
  let container: Container;
  let instance: ForeignChainReplicator;
  const subject = async (foreignChainId: TForeignChainsIds) => instance.apply({ foreignChainId });
  let blockChainDataFactory: StubbedInstance<BlockChainDataFactory>;
  let avalancheBlockReplicator: StubbedInstance<AvalancheBlockReplicator>;
  let ethereumBlockReplicator: StubbedInstance<EthereumBlockReplicator>;
  let polygonBlockReplicator: StubbedInstance<PolygonBlockReplicator>;
  let arbitrumBlockReplicator: StubbedInstance<ArbitrumBlockReplicator>;
  let foreignChainStatus: SinonStub;
  let wallet: Wallet;
  let replicationStatus: ReplicationStatus;
  let block: StubbedInstance<IBlock>;
  let blockChainData: StubbedInstance<IBlockChainData>;
  let blockchainRepository: StubbedInstance<BlockchainRepository>;
  let chainContractRepository: StubbedInstance<ChainContractRepository>;
  let provider: StubbedInstance<ethers.providers.StaticJsonRpcProvider>;

  after(() => {
    sinon.restore();
  });

  describe('#apply', async () => {
    describe('when balance is enough', () => {
      before(async () => {
        container = getTestContainer();
        blockChainDataFactory = stubConstructor(BlockChainDataFactory);
        avalancheBlockReplicator = stubConstructor(AvalancheBlockReplicator);
        ethereumBlockReplicator = stubConstructor(EthereumBlockReplicator);
        polygonBlockReplicator = stubConstructor(PolygonBlockReplicator);
        arbitrumBlockReplicator = stubConstructor(ArbitrumBlockReplicator);
        blockchainRepository = createStubInstance(BlockchainRepository);
        chainContractRepository = createStubInstance(ChainContractRepository);
        provider = createStubInstance(ethers.providers.StaticJsonRpcProvider);
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
        container.bind(ArbitrumBlockReplicator).toConstantValue(arbitrumBlockReplicator);
        container.bind(BlockChainDataFactory).toConstantValue(blockChainDataFactory);
        container.bind(BlockchainRepository).toConstantValue(<BlockchainRepository>(<unknown>blockchainRepository));
        container
          .bind(ChainContractRepository)
          .toConstantValue(<ChainContractRepository>(<unknown>chainContractRepository));

        foreignChainStatus = sinon.stub();
        avalancheBlockReplicator.getStatus.resolves(<ForeignChainStatus>(<unknown>foreignChainStatus));
        ethereumBlockReplicator.getStatus.resolves(<ForeignChainStatus>(<unknown>foreignChainStatus));
        polygonBlockReplicator.getStatus.resolves(<ForeignChainStatus>(<unknown>foreignChainStatus));
        arbitrumBlockReplicator.getStatus.resolves(<ForeignChainStatus>(<unknown>foreignChainStatus));
        block = stubConstructor(Block);
        avalancheBlockReplicator.resolvePendingBlocks.resolves([block]);
        ethereumBlockReplicator.resolvePendingBlocks.resolves([block]);
        polygonBlockReplicator.resolvePendingBlocks.resolves([block]);
        arbitrumBlockReplicator.resolvePendingBlocks.resolves([block]);
        replicationStatus = { blocks: [block], anchors: [1], fcds: [{ keys: [], values: [] }] };
        avalancheBlockReplicator.replicate.resolves(replicationStatus);
        ethereumBlockReplicator.replicate.resolves(replicationStatus);
        polygonBlockReplicator.replicate.resolves(replicationStatus);
        arbitrumBlockReplicator.replicate.resolves(replicationStatus);

        blockChainData = stubObject<IBlockChainData>(new BlockChainData(mockBlockChainDataFactory.attributes()));
        blockChainData.save.resolves();
        blockChainDataFactory.fromBlock.returns(blockChainData);

        instance = container.get(ForeignChainReplicator);
      });

      after(() => {
        sinon.restore();
      });

      ForeignChainsIds.filter((x) => !NonEvmChainsIds.includes(x)).forEach((foreignChainId: TForeignChainsIds) => {
        it(`replicates blocks for ${foreignChainId}`, async () => {
          const result = <IBlockChainData[]>await subject(foreignChainId);
          expect(result.length).to.eq(1);
          expect(result[0]).to.eq(blockChainData);
        });
      });
    });

    describe('when balance is not enough', () => {
      before(async () => {
        container = getTestContainer();
        blockChainDataFactory = stubConstructor(BlockChainDataFactory);
        avalancheBlockReplicator = stubConstructor(AvalancheBlockReplicator);
        ethereumBlockReplicator = stubConstructor(EthereumBlockReplicator);
        polygonBlockReplicator = stubConstructor(PolygonBlockReplicator);
        arbitrumBlockReplicator = stubConstructor(ArbitrumBlockReplicator);
        blockchainRepository = createStubInstance(BlockchainRepository);
        provider = createStubInstance(ethers.providers.StaticJsonRpcProvider);

        wallet = Wallet.createRandom();
        sinon.stub(wallet, 'getBalance').resolves(parseEther('0.001'));

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
        container.bind(ArbitrumBlockReplicator).toConstantValue(arbitrumBlockReplicator);
        container.bind(BlockChainDataFactory).toConstantValue(blockChainDataFactory);
        container.bind(BlockchainRepository).toConstantValue(<BlockchainRepository>(<unknown>blockchainRepository));

        foreignChainStatus = sinon.stub();
        avalancheBlockReplicator.getStatus.resolves(<ForeignChainStatus>(<unknown>foreignChainStatus));
        ethereumBlockReplicator.getStatus.resolves(<ForeignChainStatus>(<unknown>foreignChainStatus));
        polygonBlockReplicator.getStatus.resolves(<ForeignChainStatus>(<unknown>foreignChainStatus));
        arbitrumBlockReplicator.getStatus.resolves(<ForeignChainStatus>(<unknown>foreignChainStatus));
        block = stubConstructor(Block);
        avalancheBlockReplicator.resolvePendingBlocks.resolves([block]);
        ethereumBlockReplicator.resolvePendingBlocks.resolves([block]);
        polygonBlockReplicator.resolvePendingBlocks.resolves([block]);
        arbitrumBlockReplicator.resolvePendingBlocks.resolves([block]);
        replicationStatus = { blocks: [block], anchors: [1], fcds: [{ keys: [], values: [] }] };
        avalancheBlockReplicator.replicate.resolves(replicationStatus);
        ethereumBlockReplicator.replicate.resolves(replicationStatus);
        polygonBlockReplicator.replicate.resolves(replicationStatus);
        arbitrumBlockReplicator.replicate.resolves(replicationStatus);

        blockChainData = stubObject<IBlockChainData>(new BlockChainData(mockBlockChainDataFactory.attributes()));
        blockChainData.save.resolves();
        blockChainDataFactory.fromBlock.returns(blockChainData);

        instance = container.get(ForeignChainReplicator);
      });

      after(() => {
        sinon.restore();
      });

      ForeignChainsIds.filter((x) => !NonEvmChainsIds.includes(x)).forEach((foreignChainId: TForeignChainsIds) => {
        it(`should not replicates blocks for ${foreignChainId}`, async () => {
          const result = <IBlockChainData[]>await subject(foreignChainId);
          expect(result).to.eq(undefined);
        });
      });
    });
  });
});
