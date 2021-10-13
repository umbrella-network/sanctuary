import 'reflect-metadata';
import { getTestContainer } from '../helpers/getTestContainer';
import { Container } from 'inversify';
import { ForeignChainReplicator } from '../../src/services/ForeignChainReplicator';
import sinon, { SinonStub } from 'sinon';
import {
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
import { ForeignChainsIds } from '../../src/types/ChainsIds';

describe('ForeignChainReplicator', () => {
  let container: Container;
  let instance: ForeignChainReplicator;
  const subject = async (foreignChainId: string) => instance.apply({ foreignChainId });
  let foreignBlockFactory: StubbedInstance<ForeignBlockFactory>;
  let ethereumBlockReplicator: StubbedInstance<EthereumBlockReplicator>;
  let polygonBlockReplicator: StubbedInstance<PolygonBlockReplicator>;
  let foreignChainStatus: SinonStub;
  let replicationStatus: ReplicationStatus;
  let block: StubbedInstance<IBlock>;
  let foreignBlock: StubbedInstance<IForeignBlock>;

  before(async () => {
    container = getTestContainer();
    foreignBlockFactory = stubConstructor(ForeignBlockFactory);
    ethereumBlockReplicator = stubConstructor(EthereumBlockReplicator);
    polygonBlockReplicator = stubConstructor(PolygonBlockReplicator);
    container.bind(EthereumBlockReplicator).toConstantValue(ethereumBlockReplicator);
    container.bind(PolygonBlockReplicator).toConstantValue(polygonBlockReplicator);
    container.bind(ForeignBlockFactory).toConstantValue(foreignBlockFactory);

    foreignChainStatus = sinon.stub();
    ethereumBlockReplicator.getStatus.resolves(<ForeignChainStatus>(<unknown>foreignChainStatus));
    polygonBlockReplicator.getStatus.resolves(<ForeignChainStatus>(<unknown>foreignChainStatus));
    block = stubConstructor(Block);
    ethereumBlockReplicator.resolvePendingBlocks.resolves([block]);
    polygonBlockReplicator.resolvePendingBlocks.resolves([block]);
    replicationStatus = { blocks: [block], anchors: [1], fcds: [{ keys: [], values: [] }] };
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

  describe('#apply', async () => {
    ForeignChainsIds.forEach((foreignChainId) => {
      it(`replicates blocks for ${foreignChainId}`, async () => {
        const result = <IForeignBlock[]>await subject(foreignChainId);
        expect(result.length).to.eq(1);
        expect(result[0]).to.eq(foreignBlock);
      });
    });
  });
});
