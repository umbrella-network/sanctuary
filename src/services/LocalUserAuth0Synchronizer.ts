import { inject, injectable } from 'inversify';
import { Logger } from 'winston';
import { ManagementClient } from 'auth0';
import LocalUser from '../models/LocalUser';
import Settings from '../types/Settings';

@injectable()
export class LocalUserAuth0Synchronizer {
  @inject('Logger')
  private logger!: Logger;

  @inject('Settings')
  private settings!: Settings;

  @inject('Auth0ManagementClient')
  private auth0: ManagementClient;

  async apply(): Promise<void> {
    const users = await LocalUser.find();

    const payload = JSON.stringify(
      users.map((u) => ({
        user_id: u._id,
        email: u.email,
        password_hash: u.password,
        email_verified: true,
      }))
    );

    this.logger.info(`Synchronizing ${users.length} users`);

    await this.auth0.importUsers({
      connection_id: this.settings.auth0.connectionId,
      users_json: payload,
      upsert: false,
    });

    this.logger.info('Done!');
  }
}
