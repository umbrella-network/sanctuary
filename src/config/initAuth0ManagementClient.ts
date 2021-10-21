import Settings from '../types/Settings';
import { ManagementClient } from 'auth0';

export function initAuth0ManagementClient(settings: Settings): ManagementClient {
  return new ManagementClient({
    domain: settings.auth0.domain,
    clientId: settings.auth0.clientId,
    clientSecret: settings.auth0.clientSecret
  });
}
