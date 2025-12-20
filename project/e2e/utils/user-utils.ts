import { DbUtils } from './db-utils';
import { faker } from '@faker-js/faker';

export class UserUtils {
  static DB_NAME = 'auth_user';
  static async create(overrides?: { name?: string; email?: string; id?: string }): Promise<any> {
    const email = overrides?.email ?? faker.internet.email();
    const user = {
      _id: overrides?.id ?? faker.string.uuid(),
      __v: 0,
      authenticationDetails: {
        username_password: {
          password: '$2b$10$NxQPb2ZQExFSdGZjQsY59u4aUNsNdzKXmGMQhN4zpVjsrLHAJGv4K', //12345678 passwor encript
          userName: email,
        },
      },
      email: email,
      name: overrides?.name ?? faker.person.fullName(),
      roles: ['user'],
      row_created_at: { $date: '2025-05-08T10:38:49.060Z' },
      row_updated_at: { $date: '2025-05-08T10:38:49.060Z' },
    };

    await DbUtils.insertDocuments(UserUtils.DB_NAME, user);
    return user;
  }
}
