import { injectable } from 'inversify';
import ApiKey from '../models/ApiKey';
import { IApiKey } from '../models/ApiKey';

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
}
