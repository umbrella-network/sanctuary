/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import UsageMetricsRepository from '../../../src/services/analytics/UsageMetricsRepository';
import * as influxUtils from '../../../src/services/analytics/influxUtils';

import sinon from 'sinon';
import { expect } from 'chai';

describe('UsageMetricsRepository', () => {
  describe('retrieveUsageMetrics', () => {
    describe('without period', () => {
      const rows = [
        {
          _time: '2021-08-21T00:00:00Z',
          apiKey: '1337',
          route: 'blocks/leaves',
          method: 'GET',
        },
        {
          _time: '2021-08-22T00:00:00Z',
          apiKey: '1337',
          route: 'blocks/leaves',
          method: 'GET',
        },
        {
          _time: '2021-08-19T00:00:00Z',
          apiKey: '47',
          route: 'blocks/leaves',
          method: 'GET',
        },
      ];

      const expectedUsageMetrics = JSON.stringify([
        {
          time: '2021-08-22T00:00:00Z',
          apiKey: '1337',
          route: 'blocks/leaves',
          method: 'GET',
        },
        {
          time: '2021-08-21T00:00:00Z',
          apiKey: '1337',
          route: 'blocks/leaves',
          method: 'GET',
        },
        {
          time: '2021-08-19T00:00:00Z',
          apiKey: '47',
          route: 'blocks/leaves',
          method: 'GET',
        },
      ]);

      const apiKeys = ['1337', '47'];

      beforeEach(() => {
        sinon.stub(influxUtils, 'collectRowsFromQuery').resolves(rows);
      });

      afterEach(() => sinon.restore());

      it('returns a list of api usage ordered by date', async () => {
        const usageMetrics = await UsageMetricsRepository.retrieveUsageMetrics(apiKeys);

        expect(JSON.stringify(usageMetrics)).to.equal(expectedUsageMetrics);
      });
    });

    describe('with period', () => {
      const rows = [
        {
          _time: '2021-08-21T01:00:00Z',
          _value: 12,
        },
        {
          _time: '2021-08-21T01:05:00Z',
          _value: 7,
        },
        {
          _time: '2021-08-21T01:15:00Z',
          _value: 8,
        },
      ];

      const filledMetric = {
        time: '2021-08-21T01:10:00Z',
        amount: 0,
      };

      const expectedUsageMetrics = [
        {
          time: '2021-08-21T01:15:00Z',
          amount: 8,
        },
        filledMetric,
        {
          time: '2021-08-21T01:05:00Z',
          amount: 7,
        },
        {
          time: '2021-08-21T01:00:00Z',
          amount: 12,
        },
      ];

      beforeEach(() => {
        sinon.stub(influxUtils, 'collectRowsFromQuery').resolves(rows);
      });

      afterEach(() => sinon.restore());

      it('returns a histogram of api usage with filled blank values', async () => {
        const usageMetrics = await UsageMetricsRepository.retrieveUsageMetrics([], '1h');

        expect(usageMetrics).to.eql(expectedUsageMetrics);
      });
    });
  });
});
