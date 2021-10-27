/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import { ProjectAuthUtils } from '../../src/services/ProjectAuthUtils';
import { Request, Response } from 'express';
import { IApiKey } from '../../src/models/ApiKey';
import UsageMetricsRepository from '../../src/services/analytics/UsageMetricsRepository';
import sinon from 'sinon';
import { expect } from 'chai';

describe('AuthUtils', () => {
  const authUtils = new ProjectAuthUtils();

  const fullRoute = 'blocks/leaves';
  const method = 'GET';

  const apiKey = { key: '133757622321', projectId: '123' } as IApiKey;
  const mockVerificationResult = { apiKey };
  const mockRequest = {
    headers: { authorization: `Bearer ${apiKey.key}` },
    path: 'leaves',
    method,
    baseUrl: 'blocks/',
  } as Request;

  describe('#verifyApiKey', () => {
    beforeEach(() => {
      sinon.stub(ProjectAuthUtils.prototype, 'verifyApiKeyFromAuthHeader').resolves(mockVerificationResult);
    });

    it('registers usage metric on API authentication', async () => {
      const usageMetricsRepositorySpy = sinon.stub(UsageMetricsRepository, 'register').resolves();
      await authUtils.verifyApiKey(mockRequest, {} as Response);
      expect(usageMetricsRepositorySpy.calledWith(apiKey.key, fullRoute, method)).to.be.true;
    });
  });
});
