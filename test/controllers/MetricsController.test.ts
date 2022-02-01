import 'reflect-metadata';
import { expect } from 'chai';

import MetricsController from '../../src/controllers/MetricsController';
import { getTestContainer } from '../helpers/getTestContainer';
import sinon from 'sinon';
import { Request, Response } from 'express';
import { MetricsRepository } from '../../src/repositories/MetricsRepository';
import { Container } from 'inversify';

const mockResponse = {
  status: sinon.stub().returns({ end: sinon.stub() }),
  send: sinon.stub(),
};

describe('MetricsRepository', () => {
  let container: Container;
  let metricsController: MetricsController;
  let metricsRepository: sinon.SinonStubbedInstance<MetricsRepository>;
  let mockRequest: Request;

  describe('#getVotersCount', () => {
    beforeEach(() => {
      container = getTestContainer();
      metricsRepository = sinon.createStubInstance(MetricsRepository);
      container.bind(MetricsController).toSelf();
      container.bind(MetricsRepository).toConstantValue(<MetricsRepository>(<unknown>metricsRepository));
      metricsController = container.get(MetricsController);
      mockRequest = ({ query: {} } as unknown) as Request;
    });

    afterEach(() => {
      sinon.restore();
    });

    describe('Given a valid request query', () => {
      it('should call getVotersCount with startDate and endDate at midnight time', async () => {
        mockRequest.query = { startDate: '2021-12-01', endDate: '2022-01-01' };
        metricsRepository.getVotersCount.resolves([{ _id: '0xA405324F4b6EB7Bc76f1964489b3769cfc71445H', count: 1 }]);

        await metricsController.getVotersCount(mockRequest, (mockResponse as unknown) as Response);

        expect(
          metricsRepository.getVotersCount.calledWith({
            startDate: new Date('2021-12-01T00:00:00.000Z'),
            endDate: new Date('2022-01-01T00:00:00.000Z'),
          })
        ).to.be.ok;
      });
    });

    describe('Given an invalid request query', () => {
      it('should call response.status(400) when missing startDate and endDate', async () => {
        await metricsController.getVotersCount(mockRequest, (mockResponse as unknown) as Response);

        expect(mockResponse.status.calledWith(400)).to.be.ok;
      });

      it('should call response.status(400) when missing endDate', async () => {
        mockRequest.query.startDate = '2021-12-01';

        await metricsController.getVotersCount(mockRequest, (mockResponse as unknown) as Response);

        expect(mockResponse.status.calledWith(400)).to.be.ok;
      });

      it('should call response.status(400) when missing startDate', async () => {
        mockRequest.query.endDate = '2021-12-01';

        await metricsController.getVotersCount(mockRequest, (mockResponse as unknown) as Response);

        expect(mockResponse.status.calledWith(400)).to.be.ok;
      });

      it('should call response.status(400) when invalid data', async () => {
        mockRequest.query.tartDate = 'invalid date';

        await metricsController.getVotersCount(mockRequest, (mockResponse as unknown) as Response);

        expect(mockResponse.status.calledWith(400)).to.be.ok;
      });
    });
  });
});
