import 'reflect-metadata';
import { expect } from 'chai';
import request from 'supertest';
import { Application } from 'express';
import { Container } from 'inversify';
import { format, subDays } from 'date-fns';

import Server from '../../../src/lib/Server';
import { getContainer } from '../../../src/lib/getContainer';
import { loadTestEnv } from '../../helpers';
import { inputForBlockModel } from '../../fixtures/inputForBlockModel';
import settings from '../../../src/config/settings';
import { setupDatabase, teardownDatabase } from '../../helpers/databaseHelpers';
import Block from '../../../src/models/Block';

describe('signatures', () => {
  let container: Container;
  let app: Application;

  before(async () => {
    loadTestEnv();
    await setupDatabase();

    settings.api.restrict.apiKey = 'testToken';
    container = getContainer();
    container.rebind('Settings').toConstantValue(settings);
    app = container.get(Server).app;

    await Block.deleteMany();

    await Block.create({ ...inputForBlockModel, _id: 'block::1', blockId: 1, dataTimestamp: new Date() });
    await Block.create({ ...inputForBlockModel, _id: 'block::2', blockId: 2, dataTimestamp: subDays(new Date(), 1) });
    await Block.create({ ...inputForBlockModel, _id: 'block::3', blockId: 3, dataTimestamp: subDays(new Date(), 2) });
  });

  after(async () => {
    await teardownDatabase();
  });

  describe('GET /signatures', () => {
    describe('when period is not included in query', () => {
      it('responds with signature rates on the default period', async () => {
        const response = await request(app).get('/signatures');

        expect(response.status).to.eq(200);
        expect(response.body).to.be.an('array').with.length(1);
      });
    });

    describe('when period query is invalid', () => {
      it('responds with an error message', async () => {
        const resource = '/signatures?startDate=invalid&endDate=invalid';
        const response = await request(app).get(resource);

        expect(response.status).to.eq(400);
        expect(response.body).to.eql({ error: 'Period is invalid. Format must be yyyy-mm-dd.' });
      });
    });

    describe('when period query is valid', () => {
      describe('and the start date is greater than the end date', () => {
        it('responds with an error message', async () => {
          const period = {
            startDate: format(new Date(), 'yyyy-MM-dd'),
            endDate: format(subDays(new Date(), 5), 'yyyy-MM-dd'),
          };

          const resource = `/signatures?startDate=${period.startDate}&endDate=${period.endDate}`;
          const response = await request(app).get(resource);

          expect(response.status).to.eq(400);
          expect(response.body).to.eql({ error: 'Period is invalid. startDate must be lower than endDate' });
        });
      });

      describe('and the range of the period exceeds the configured limit', () => {
        it('responds with an error message', async () => {
          const period = {
            startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
            endDate: format(new Date(), 'yyyy-MM-dd'),
          };

          const resource = `/signatures?startDate=${period.startDate}&endDate=${period.endDate}`;
          const response = await request(app).get(resource);

          expect(response.status).to.eq(400);
          expect(response.body).to.eql({
            error: `Period range must be lower or equal than ${settings.signatures.maxSearchRange} days.`,
          });
        });
      });

      describe('and there are blocks in period', () => {
        it('responds with signature rates on the inserted period', async () => {
          const period = {
            startDate: format(subDays(new Date(), 5), 'yyyy-MM-dd'),
            endDate: format(new Date(), 'yyyy-MM-dd'),
          };

          const resource = `/signatures?startDate=${period.startDate}&endDate=${period.endDate}`;
          const response = await request(app).get(resource);

          expect(response.status).to.eq(200);
          expect(response.body).to.be.an('array').with.length(1);
        });
      });

      describe('and there are no blocks in period', () => {
        it('responds with an empty array', async () => {
          const resource = '/signatures?startDate=1990-05-05&endDate=1990-05-06';
          const response = await request(app).get(resource);

          expect(response.status).to.eq(200);
          expect(response.body).to.be.an('array').with.length(0);
        });
      });

      describe('and there is more than one validator', () => {
        it('responds with the signature rate of all participants', async () => {
          await Block.create({
            ...inputForBlockModel,
            _id: 'block::4',
            blockId: 4,
            dataTimestamp: new Date(),
            voters: ['0xB205324F4b6EB7Bc76f1964489b3769cfc7144A3'],
            votes: new Map([['0xB205324F4b6EB7Bc76f1964489b3769cfc7144A3', '10000000000']]),
          });

          const response = await request(app).get('/signatures');

          expect(response.status).to.eq(200);
          expect(response.body).to.be.an('array').with.length(2);
        });
      });
    });
  });
});
