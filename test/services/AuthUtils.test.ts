/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import { AuthUtils } from '../../src/services/AuthUtils';
import { Request, Response } from 'express';
import { IApiKey } from '../../src/models/ApiKey';
import UsageMetricsRepository from '../../src/services/analytics/UsageMetricsRepository';
import sinon from 'sinon';
import { expect } from 'chai';


describe('AuthUtils', () => {
  const authUtils = new AuthUtils;

  const bearerKey = '1337';
  const fullRoute = 'blocks/leaves';
  const method = 'GET';

  const apiKey = { key: '133757622321', projectId: '123' } as IApiKey;
  const mockVerificationResult = { apiKey };
  const mockRequest = {
    headers: { authorization: `Bearer ${bearerKey}` },
    route: { path: 'leaves' },
    method,
    baseUrl: 'blocks/',
  } as Request;

  describe('usageMetrics', () => {
    beforeEach(() => {
      sinon.stub(AuthUtils.prototype, 'verifyApiKeyFromAuthHeader').resolves(mockVerificationResult);
    });


    it('registers usage metric on API authentication', async () => {
      const usageMetricsRepositorySpy = sinon.stub(UsageMetricsRepository, 'register').resolves();

      await authUtils.verifyApiKey(mockRequest, {} as Response);

      expect(usageMetricsRepositorySpy.calledWith(bearerKey, fullRoute, method)).to.be.true;
    });
  });
});
