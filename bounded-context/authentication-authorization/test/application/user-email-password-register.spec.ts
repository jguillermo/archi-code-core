import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { User, UserEmailPasswordRegisterDto, UserPasswordEncryptor, UserRegister, UserRepository } from '../../src';
import { UserObjectMother } from '../object-mother/user-object-mother';

import { Builder } from '@code-core/domain';

describe('User Email Password Register', () => {
  let useRegisterCase: UserRegister;
  let mockRepository: jest.Mocked<UserRepository>;
  let mockEncryptor: jest.Mocked<UserPasswordEncryptor>;
  let user: User;

  beforeEach(() => {
    user = UserObjectMother();

    mockRepository = {
      persist: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn().mockImplementation((email: any) => Promise.resolve(email['value'] === 'userRegistered@mail.com' ? user : null)),
    } as jest.Mocked<UserRepository>;

    mockEncryptor = {
      encrypt: jest.fn().mockImplementation((password) => Promise.resolve(`${password}EncryptedPassword`)),
      verify: jest.fn().mockImplementation((password) => Promise.resolve(password === 'testPassword')),
    } as jest.Mocked<UserPasswordEncryptor>;

    useRegisterCase = new UserRegister(mockRepository, mockEncryptor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register by email and password', () => {
    it('should register a user with correct credentials', async () => {
      const userEmailPasswordRegisterDto = Builder(UserEmailPasswordRegisterDto).name('testUser').email('user@mail.com').password('123456').build();
      const id = await useRegisterCase.emailPasswordMethod(userEmailPasswordRegisterDto);
      expect(mockRepository.persist).toBeCalledTimes(1);
      expect(mockEncryptor.encrypt).toBeCalledTimes(1);
      const persistedUser = mockRepository.persist.mock.calls[0][0];
      expect(persistedUser).toBeInstanceOf(User);
      expect(persistedUser.toJson()).toEqual({
        id: id.value,
        name: 'testUser',
        roles: ['user'],
        authenticationDetails: {
          username_password: {
            password: '123456EncryptedPassword',
            userName: 'user@mail.com',
          },
        },
      });
    });

    it('should not register if email there is registered', async () => {
      const userEmailPasswordRegisterDto = Builder(UserEmailPasswordRegisterDto).name('testUser').email('userRegistered@mail.com').password('123456').build();
      await expect(() => useRegisterCase.emailPasswordMethod(userEmailPasswordRegisterDto)).rejects.toThrow('User already exists');
    });
  });
});
