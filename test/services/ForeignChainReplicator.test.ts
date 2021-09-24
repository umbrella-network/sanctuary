import 'reflect-metadata';
import { getTestContainer } from '../helpers/getTestContainer';
import { Container } from 'inversify';
import { ForeignChainReplicator } from '../../src/services/ForeignChainReplicator';
import sinon, { SinonStub } from 'sinon';
import { EthereumBlockReplicator } from '../../src/services/foreign-chain';
import { ReplicationStatus } from '../../src/services/foreign-chain/ForeignBlockReplicator';
import ForeignBlock, { IForeignBlock } from '../../src/models/ForeignBlock';
import { StubbedInstance, stubConstructor, stubObject } from 'ts-sinon';
import { ForeignBlockFactory } from '../../src/factories/ForeignBlockFactory';
import { ForeignChainStatus } from '../../src/types/ForeignChainStatus';
import Block, { IBlock } from '../../src/models/Block';
import { expect } from 'chai';
import { foreignBlockFactory as mockForeignBlockFactory } from '../mocks/factories/foreignBlockFactory';

describe('ForeignChainReplicator', () => {
  let container: Container;
  let instance: ForeignChainReplicator;
  const subject = async () => await instance.apply({ foreignChainId: 'ethereum' });
  let foreignBlockFactory: StubbedInstance<ForeignBlockFactory>;
  let ethereumBlockReplicator: StubbedInstance<EthereumBlockReplicator>;
  let foreignChainStatus: SinonStub;
  let replicationStatus: ReplicationStatus;
  let block: StubbedInstance<IBlock>;
  let foreignBlock: StubbedInstance<IForeignBlock>;

  before(async () => {
    container = getTestContainer();
    foreignBlockFactory = stubConstructor(ForeignBlockFactory);
    ethereumBlockReplicator = stubConstructor(EthereumBlockReplicator);
    container.bind(EthereumBlockReplicator).toConstantValue(ethereumBlockReplicator);
    container.bind(ForeignBlockFactory).toConstantValue(foreignBlockFactory);

    foreignChainStatus = sinon.stub();
    ethereumBlockReplicator.getStatus.resolves(<ForeignChainStatus><unknown>foreignChainStatus);
    block = stubConstructor(Block);
    ethereumBlockReplicator.resolvePendingBlocks.resolves([block]);
    replicationStatus = { blocks: [block], anchors: [1] };
    ethereumBlockReplicator.replicate.resolves(replicationStatus);

    foreignBlock = stubObject<IForeignBlock>(new ForeignBlock(mockForeignBlockFactory.attributes()));
    foreignBlock.save.resolves();
    foreignBlockFactory.fromBlock.returns(foreignBlock);

    instance = container.get(ForeignChainReplicator);
  });

  after(() => {
    sinon.restore();
  });

  describe('#apply', async () => {
    it('replicates blocks', async () => {
      const result = <IForeignBlock[]> await subject();
      expect(result.length).to.eq(1);
      expect(result[0]._id).to.eq(foreignBlock._id);
      // class Engine {
      //   pistons: Piston[];
      //
      //   check = (): string[] => {
      //     this.logCheckCall();
      //     return this.pistons.map((p) => p.check());
      //   }
      //
      //   checkWithMethod = (): string[] => this.pistons.map((p) => p.method());
      //
      //   private logCheckCall = () => console.log('check start');
      // }
      //
      // class Piston {
      //   check = (): string => 'Piston OK';
      //   run = () => logger.info('Running');
      //   method(): string { return 'METHOD OK'; }
      // }
      //
      // // No Lib
      // const engine = new Engine();
      // const piston = <Piston><unknown> { check: (): string => 'MOCKED' };
      // engine.pistons = [piston];
      // console.log(engine.check());

      // // TS Mockito
      // const engine = new Engine();
      // const PistonMock = mock(Piston);
      // when(PistonMock.check).thenReturn((): string => 'MOCKED');
      // const piston = instance(PistonMock);
      // engine.pistons = [piston];
      // console.log(engine.check());

      // // Sinon Simple Stub - ONLY WORKS WITH METHODS!
      // const engine = new Engine();
      // const piston = sinon.createStubInstance(Piston);
      // piston.method.returns('MOCKED');
      // engine.pistons = [<Piston><unknown>piston];
      // console.log(engine.checkWithMethod());

      // // Sinon Arrow Stub
      // const engine = new Engine();
      // const piston = sinon.createStubInstance(Piston);
      // piston.check = sinon.stub();
      // piston.check.returns('MOCKED');
      // engine.pistons = [<Piston><unknown>piston];
      // console.log(engine.check());

      // // TS-Sinon (Arrow)
      // const engine = new Engine();
      // const piston = stubConstructor(Piston);
      // piston.check = sinon.stub();
      // piston.check.returns('MOCKED');
      // engine.pistons = [piston];
      // console.log(engine.check());

      // // TS-Sinon (Method)
      // const engine = new Engine();
      // const piston = stubObject<Piston>(new Piston());
      // piston.method.returns('MOCKED');
      // engine.pistons = [piston];
      // console.log(engine.checkWithMethod());
    });
  });
});
