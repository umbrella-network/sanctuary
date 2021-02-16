import { injectable } from 'inversify';
import ApiKey from '../models/ApiKey';
import { IApiKey } from '../models/ApiKey';
import Token from '../types/Token';
import * as jwt from 'jsonwebtoken';

@injectable()
export class AuthUtils {
  async verifyApiKeyFromAuthHeader(
    authorizationHeader?: string
  ): Promise<{ apiKey: IApiKey; errorMessage?: void } | { apiKey?: void; errorMessage: string }> {
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
