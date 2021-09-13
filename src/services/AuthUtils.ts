import { injectable } from 'inversify';
import * as jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import ApiKey from '../models/ApiKey';
import { IApiKey } from '../models/ApiKey';
import Token from '../types/Token';
import UsageMetricsRepository from './analytics/UsageMetricsRepository';

export type ApiKeyFromAuthHeaderInterface =
  | { apiKey: IApiKey; errorMessage?: void }
  | { apiKey?: void; errorMessage: string };

@injectable()
export class AuthUtils {
  async verifyApiKey(request: Request, response: Response): Promise<ApiKeyFromAuthHeaderInterface> {
    const apiKeyVerificationResult = await this.verifyApiKeyFromAuthHeader(request.headers.authorization);

    if (!apiKeyVerificationResult.apiKey) {
      response.status(401).send({ error: apiKeyVerificationResult.errorMessage });
    } else {
      await this.registerUsage(request, apiKeyVerificationResult.apiKey);
    }

    return apiKeyVerificationResult;
  }

  async registerUsage(request: Request, apiKey: IApiKey): Promise<void> {
    try {
      const {
        path,
        method,
        baseUrl,
      } = request;

      const route = `${baseUrl}${path}`;
      UsageMetricsRepository.register(apiKey.key, route, method);
    } catch (e) {
      console.log(e);
    }
  }

  async verifyApiKeyFromAuthHeader(authorizationHeader?: string): Promise<ApiKeyFromAuthHeaderInterface> {
    if (!authorizationHeader) {
      return { errorMessage: 'No authorization header' };
    }

    const key = authorizationHeader.replace('Bearer ', '');

    const apiKey = await ApiKey.findOne({ key });

    if (!apiKey) {
      return { errorMessage: 'Unknown API key' };
    }

    if (apiKey.expiresAt && apiKey.expiresAt.valueOf() < new Date().valueOf()) {
      return { errorMessage: 'API key is expired' };
    }

    return { apiKey };
  }

  getAuthorizationToken(
    authorizationHeader: string
  ): { token: Token; errorMessage?: void } | { token?: void; errorMessage: string } {
    if (!authorizationHeader) {
      return { errorMessage: 'No authorization header' };
    }

    const token = authorizationHeader.replace('Bearer ', '');
    try {
      const decoded = jwt.verify(token, process.env.AUTH_PRIVATE_KEY);
      return { token: decoded as Token };
    } catch {
      return { errorMessage: 'Invalid authorization header' };
    }
  }
}
