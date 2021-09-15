import 'reflect-metadata';
// import logger from '../../src/lib/logger';
//
// describe('ForeignChainReplicator', async () => {
//   it('logs errors', () => {
//     logger.info('test');
//
//     try {
//       throw new Error('ERROR');
//     } catch (e) {
//       logger.error(e);
//     }
//   });
// });

// import { expect } from 'chai';
// import { instance, mock, verify, when } from 'ts-mockito';
// import { EthereumBlockReplicator, IForeignBlockReplicator } from '../../src/services/foreign-chain';
// import { ForeignChainStatus } from '../../src/types/ForeignChainStatus';
// import { resolvableInstance } from '../helpers/resolvableInstance';
// import { IBlock } from '@umb-network/toolbox/dist/models/ChainBlock';
// import { ForeignBlockFactory } from '../../src/factories/ForeignBlockFactory';
// import ForeignBlock from '../../src/models/ForeignBlock';
// import Block from '../../src/models/Block';
//
// describe('ForeignChainReplicator', () => {
//   describe('#apply', () => {
//     const MockForeignChainStatus = mock<ForeignChainStatus>();
//     const foreignChainStatus = resolvableInstance(MockForeignChainStatus);
//
//     const MockBlock = mock(Block);
//     const block = instance(MockBlock);
//
//     const MockForeignBlockReplicator = mock(EthereumBlockReplicator);
//     const replicator = instance(MockForeignBlockReplicator);
//
//     const MockForeignBlockFactory = mock(ForeignBlockFactory);
//     const foreignBlockFactory = instance(MockForeignBlockReplicator);
//
//     const MockForeignBlock = mock(ForeignBlock);
//     const foreignBlock = instance(MockForeignBlock);
//
//   });
// });
//
//
// // import 'reflect-metadata';
// // import '../../src/config/setupDotenv';
// // import { anything, instance, mock, verify, when } from 'ts-mockito';
// // import { assert, expect } from 'chai';
// // import { getTestContainer } from '../helpers/getTestContainer';
// // import {
// //   EthereumBlockReplicator,
// //   ForeignBlockReplicator,
// //   IForeignBlockReplicator
// // } from '../../src/services/foreign-chain';
// // import { ForeignChainReplicator } from '../../src/services/ForeignChainReplicator';
// // import { ForeignBlockFactory } from '../../src/factories/ForeignBlockFactory';
// // import { IBlock } from '../../src/models/Block';
// // import { ForeignChainStatus } from '../../src/types/ForeignChainStatus';
// // import { ReplicationStatus } from '../../src/services/foreign-chain/ForeignBlockReplicator';
// // import ForeignBlock, { IForeignBlock } from '../../src/models/ForeignBlock';
// // import { Logger } from 'winston';
// //
// // const resolvableInstance = <T extends {}>(mock: T) => new Proxy<T>(instance(mock), {
// //   get(target, name: PropertyKey) {
// //     if (["Symbol(Symbol.toPrimitive)", "then", "catch"].includes(name.toString())) {
// //       return undefined;
// //     }
// //
// //     return (target as any)[name];
// //   },
// // });
// //
// // describe('ForeignChainReplicator', async () => {
// //   const container = getTestContainer();
// //
// //   describe('#apply', () => {
// //     // let instance: ForeignChainReplicator;
// //     // let mockForeignChainStatus: ForeignChainStatus;
// //     // let mockBlock: IBlock;
// //     // let mockReplicationStatus: ReplicationStatus;
// //     // let ethereumBlockReplicator: EthereumBlockReplicator;
// //     // let mockForeignBlock: IForeignBlock;
// //
// //
// //
// //     // const mockForeignChainStatus = mock<ForeignChainStatus>();
// //     // const mockBlocks = [mock<IBlock>()];
// //     // const mockReplicationStatus = mock<ReplicationStatus>();
// //     // const mockEthereumBlockReplicator = mock<EthereumBlockReplicator>(EthereumBlockReplicator);
// //     // when(mockEthereumBlockReplicator.getStatus()).thenResolve(mockForeignChainStatus);
// //     // when(mockEthereumBlockReplicator.resolvePendingBlocks(anything(), anything())).thenResolve(mockBlocks);
// //     // when(mockEthereumBlockReplicator.replicate(anything(), anything())).thenResolve(mockReplicationStatus);
// //     // container.bind(EthereumBlockReplicator).toConstantValue(mockEthereumBlockReplicator);
// //     //
// //     // const mockForeignBlock = mock<IForeignBlock>(ForeignBlock);
// //     // when(mockForeignBlock.save()).thenResolve();
// //     //
// //     // const mockForeignBlockFactory = mock(ForeignBlockFactory);
// //     // when(mockForeignBlockFactory.fromBlock(anything())).thenReturn(mockForeignBlock);
// //     // container.bind(ForeignBlockFactory).toConstantValue(mockForeignBlockFactory);
// //
// //     // beforeEach(async () => {
// //       // mockForeignChainStatus = mock<ForeignChainStatus>();
// //       // mockBlock = mock<IBlock>();
// //       // mockReplicationStatus = mock<ReplicationStatus>();
// //       // when(mockEthereumBlockReplicator.getStatus()).thenResolve(mockForeignChainStatus);
// //       // instance = container.get(ForeignChainReplicator);
// //     // });
// //
// //     // it('Asyncs', async function() {
// //     //   const promise = new Promise((resolve, reject) => resolve(false));
// //     //
// //     //   return promise.then((res) => assert.equal(false, true));
// //     //   // const result = await promise;
// //     //   // expect(result).to.eq(false);
// //     // });
// //
// //     it('Checks', async () => {
// //       const MockForeignChainStatus = mock<ForeignChainStatus>();
// //       when(MockForeignChainStatus.chainAddress).thenReturn('BLAH');
// //       const foreignChainStatus = resolvableInstance(MockForeignChainStatus);
// //
// //       const MockBlockReplicator = mock(EthereumBlockReplicator);
// //       when(MockBlockReplicator.getStatus()).thenReturn(Promise.resolve(foreignChainStatus));
// //       const blockReplicator = instance(MockBlockReplicator);
// //       container.bind(EthereumBlockReplicator).toConstantValue(blockReplicator);
// //
// //       const result = await blockReplicator.getStatus();
// //       expect(result.chainAddress).to.eq('BLAH');
// //
// //       // const result = await (Promise.resolve(true));
// //       // expect(result).to.eq(true);
// //
// //
// //       // expect(foreignChainStatus.chainAddress).to.eq('BLAH');
// //
// //       // expect(blockReplicator.getStatus()).to.have();
// //       // return blockReplicator.getStatus().then((result) => expect(result.chainAddress).to.eq('BLUH'));
// //
// //       // return blockReplicator.getStatus().then((res) => {
// //       //   expect(res).to.eq(false);
// //       // });
// //
// //
// //     //
// //     //
// //     //   // expect(true).to.eq(true);
// //     });
// //
// //     // it('gets the foreign chain status', async () => {
// //     //   await instance.apply({ foreignChainId: 'ethereum' });
// //     //   console.log('===========');
// //     //   console.log(verify(mockEthereumBlockReplicator.getStatus()).called());
// //     //   console.log('===========');
// //     // });
// //   });
// // });
