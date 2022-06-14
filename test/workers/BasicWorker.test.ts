import 'reflect-metadata';
import IORedis from 'ioredis';
import { expect } from 'chai';

import { sleep } from '../../src/utils/sleep';
import { loadTestEnv } from '../helpers';
import { MockedWorker } from '../mocks/MockedWorker';
import { getTestContainer } from '../helpers/getTestContainer';

describe('BasicWorker', () => {
  const config = loadTestEnv();

  const settings = {
    redis: {
      url: config.REDIS_URL,
    },
  };

  const connection = new IORedis(settings.redis.url);
  const container = getTestContainer();

  container.bind<IORedis.Redis>('Redis').toConstantValue(connection);

  const worker = container.get(MockedWorker);

  beforeEach(async () => {
    await connection.flushall();
    await worker.pause();
  });

  describe('#queueName', () => {
    it('has the right queue name', () => {
      expect(worker.queueName).to.eq('MockedWorker');
    });
  });

  describe('#start', () => {
    worker.start();

    after(async () => {
      await worker.close();
    });

    it('enqueues jobs and don`t delete them', async () => {
      for (let counter = 0; counter < 10; counter++) {
        await worker.enqueue({});
      }

      let items = await connection.keys('bull:MockedWorker:*');
      expect(items.length).to.be.eq(14);

      await worker.resume();
      await sleep(500);

      items = await connection.keys('bull:MockedWorker:*');
      expect(items.length).to.be.eq(14);
    });

    it('enqueues jobs and delete them', async () => {
      for (let counter = 0; counter < 10; counter++) {
        await worker.enqueue(
          {},
          {
            removeOnComplete: true,
            removeOnFail: true,
          }
        );
      }

      let items = await connection.keys('bull:MockedWorker:*');
      expect(items.length).to.be.eq(13);

      await worker.resume();
      await sleep(500);

      items = await connection.keys('bull:MockedWorker:*');
      expect(items.length).to.be.eq(2);
    });
  });
});
