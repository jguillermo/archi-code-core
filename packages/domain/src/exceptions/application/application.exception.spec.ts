import { describe, expect, it } from '@jest/globals';
import { ApplicationException } from './application.exception';
import { ExceptionCode } from '../exception-code';

describe('Exceptions', () => {
  describe('ApplicationException', () => {
    it('should create an instance with correct properties', () => {
      const message = 'Application error';
      const exception = new ApplicationException(message);

      expect(exception).toBeInstanceOf(ApplicationException);
      expect(exception.message).toBe(message);
      expect(exception.code).toEqual(ExceptionCode.ApplicationException);
      expect(exception.description).toEqual('Application Exception (APP000)');
      expect(exception.timestamp).toBeInstanceOf(Date);
    });

    it('should create an instance with new exception codes', () => {
      class InvalidCredentialsException extends ApplicationException {
        constructor() {
          super('The user does not exist or the password is incorrect', ['auth001']);
        }
      }

      const message = 'The user does not exist or the password is incorrect';
      const exception = new InvalidCredentialsException();

      expect(exception).toBeInstanceOf(InvalidCredentialsException);
      expect(exception.message).toBe(message);
      expect(exception.code).toEqual('auth001');
      expect(exception.description).toEqual('Application Exception (APP000), InvalidCredentialsException (auth001)');
      expect(exception.timestamp).toBeInstanceOf(Date);
    });
  });
});
