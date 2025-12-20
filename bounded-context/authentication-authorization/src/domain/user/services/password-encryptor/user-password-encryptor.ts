export abstract class UserPasswordEncryptor {
  abstract encrypt(password: string): Promise<string>;

  abstract verify(password: string, hashedPassword: string): Promise<boolean>;
}
