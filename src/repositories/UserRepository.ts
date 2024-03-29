import { inject, injectable } from 'inversify';
import Settings from '../types/Settings';
import { User } from '../types/User';
import { ManagementClient, User as Auth0User } from 'auth0';
import { Logger } from 'winston';
import { isUndefined, omitBy } from 'lodash';

export type FindProps = {
  id?: string;
};

export type UpdateProps = {
  id?: string;
  data: {
    name?: string;
    givenName?: string;
    familyName?: string;
    password?: string;
  };
};

export class UserNotFoundError extends Error {}
export class UserUpdateError extends Error {}

@injectable()
export class UserRepository {
  @inject('Logger')
  private logger!: Logger;

  @inject('Settings')
  private settings!: Settings;

  @inject('Auth0ManagementClient')
  private adapter!: ManagementClient;

  async find(props: FindProps): Promise<User | undefined> {
    const { id } = props;

    try {
      const userData = await this.adapter.getUser({ id });
      return this.deserialize(userData);
    } catch (e) {
      this.logger.error(e);
      throw new UserNotFoundError();
    }
  }

  async update(props: UpdateProps): Promise<User | undefined> {
    const { id, data } = props;

    const update = omitBy(
      {
        name: data.name,
        family_name: data.familyName,
        given_name: data.givenName,
        password: data.password,
      },
      isUndefined
    );

    try {
      const userData = await this.adapter.updateUser({ id }, { ...update });
      return this.deserialize(userData);
    } catch (e) {
      this.logger.error(e);
      throw new UserUpdateError();
    }
  }

  private deserialize(data: Auth0User): User {
    return omitBy(
      {
        id: data.user_id,
        email: data.email,
        name: data.name,
        picture: data.picture,
        username: data.username,
        createdAt: data.created_at && new Date(data.created_at),
        updatedAt: data.updated_at && new Date(data.updated_at),
      },
      isUndefined
    );
  }
}
