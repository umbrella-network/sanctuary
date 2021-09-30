// import 'reflect-metadata';
// import { Container } from 'inversify';
// import IORedis from 'ioredis';
// import { mock, verify, when } from 'ts-mockito';
// import { expect } from 'chai';
// import Bull, { Queue, QueueOptions } from 'bullmq';
// import { TestWorker } from '../mocks/TestWorker';
//
// describe('BasicWorker', () => {
//   const connection = mock(IORedis);
//   const container = new Container({ autoBindInjectable: true });
//
//   container.bind<IORedis.Redis>('Redis').toConstantValue(connection);
//   const worker = container.get(TestWorker);
//
//   // let mockQueue = mock(Queue);
//   // Object.setPrototypeOf(Queue, (name: string, opts?: QueueOptions) => mockQueue);
//   // worker.queue
//   // when(worker.queue).thenReturn(mockQueue);
//
//   describe('#queueName', () => {
//     it('has the right queue name', () => {
//       expect(worker.queueName).to.eq('TestWorker');
//     });
//   });
//
//   // describe('#start', () => {
//   //   beforeAll(() => {
//   //     // when(worker.start()).thenReturn(void);
//   //   })
//
//   //   it('starts the worker', () => {
//   //     // worker.enqueue({});
//   //     // verify(mockQueue.add).called();
//   //     // worker.start();
//   //     // verify(connection.start()).called();
//   //   })
//   // })
// });
// function beforeAll(arg0: () => void) {
//   throw new Error('Function not implemented.');
// }
//
