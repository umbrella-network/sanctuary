import { inject, injectable } from 'inversify';
import * as jwt from 'jsonwebtoken';
import { Request } from 'express';
import ApiKey from '../models/ApiKey';
import { IApiKey } from '../models/ApiKey';
import Token from '../types/Token';
import UsageMetricsRepository from './analytics/UsageMetricsRepository';
import { Logger } from 'winston';
import Settings from '../types/Settings';

export type ApiKeyFromAuthHeaderInterface =
  | { apiKey: IApiKey; errorMessage?: void }
  | { apiKey?: void; errorMessage: string };

@injectable()
export class ProjectAuthUtils {
  @inject('Logger') logger!: Logger;
  @inject('Settings')
  private settings!: Settings;

  async verifyApiKey(request: Request): Promise<ApiKeyFromAuthHeaderInterface> {
    const apiKeyVerificationResult = await this.verifyApiKeyFromAuthHeader(request.headers.authorization);

    if (apiKeyVerificationResult.apiKey) {
      await this.registerUsage(request, apiKeyVerificationResult.apiKey);
    }

    return apiKeyVerificationResult;
  }

  async verifyRestrictApiKey(request: Request): Promise<{ apiKey?: string; errorMessage?: string }> {
    const {
      headers: { authorization: authorizationHeader },
    } = request;

    if (!authorizationHeader) {
      return { errorMessage: 'No authorization header' };
    }

    const apiKey = authorizationHeader.replace('Bearer ', '');

    if (apiKey !== this.settings.api.restrict.apiKey) {
      return { errorMessage: 'Unknown API key' };
    }

    return { apiKey };
  }

  async registerUsage(request: Request, apiKey: IApiKey): Promise<void> {
    try {
      const { path, method, baseUrl } = request;
      const route = `${baseUrl}${path}`;
      await UsageMetricsRepository.register(apiKey.key, route, method);
    } catch (e) {
      this.logger.error(e);
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
