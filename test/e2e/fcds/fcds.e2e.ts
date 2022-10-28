import 'reflect-metadata';
import { expect } from 'chai';
import request from 'supertest';
import { Application } from 'express';
import { Container } from 'inversify';

import Server from '../../../src/lib/Server';
import { getContainer } from '../../../src/lib/getContainer';
import { loadTestEnv } from '../../helpers';
import { fcdFactory } from '../../mocks/factories/fcdFactory';
import settings from '../../../src/config/settings';
import { setupDatabase, teardownDatabase } from '../../helpers/databaseHelpers';
import FCD from '../../../src/models/FCD';
import Feeds from '@umb-network/toolbox/dist/types/Feed';

const activeFCD = fcdFactory.build();
const inactiveFCD = fcdFactory.build({ key: 'AVAX-BNB' });

describe('FCDs', () => {
  let container: Container;
  let app: Application;

  before(async () => {
    loadTestEnv();
    await setupDatabase();

    settings.api.restrict.apiKey = 'testToken';
    settings.app.feedsOnChain =
      'https://raw.githubusercontent.com/umbrella-network/pegasus-feeds/main/prod/bsc/feedsOnChain.yaml';
    container = getContainer();
    container.rebind('Settings').toConstantValue(settings);
    app = container.get(Server).app;

    await FCD.deleteMany();
  });

  afterEach(async () => {
    await FCD.deleteMany();
  });

  after(async () => {
    await teardownDatabase();
  });

  describe('GET /fcds', () => {
    describe('when one FCD (is/is not) in the feeds file', () => {
      beforeEach(async () => {
        await FCD.create(activeFCD);
        await FCD.create(inactiveFCD);
      });

      describe('when loadFeeds retrieve some data', () => {
        it('responds with correct active status', async () => {
          const resource = '/fcds';
          const response = await request(app).get(resource);

          expect(response.status).to.eq(200);
          expect(response.body.filter((fcd: Feeds) => fcd.active)[0]).to.includes({ key: activeFCD.key, active: true });
          expect(response.body.filter((fcd: Feeds) => !fcd.active)[0]).to.includes({
            key: inactiveFCD.key,
            active: false,
          });
        });
      });

      describe('when loadFeeds fails', () => {
        beforeEach(() => {
          settings.app.feedsOnChain = 'wrongpath';
        });

        it('responds all feeds as active', async () => {
          const resource = '/fcds';
          const response = await request(app).get(resource);

          expect(response.status).to.eq(200);
          const actives = response.body.filter((fcd: Feeds) => fcd.active);
          expect(actives[0]).to.includes({ key: activeFCD.key, active: true });
          expect(actives[1]).to.includes({ key: inactiveFCD.key, active: true });
        });
      });
    });
  });
});
