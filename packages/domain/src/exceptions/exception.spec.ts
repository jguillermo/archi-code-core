import { describe, expect, it } from '@jest/globals';
import { AbstractException } from './abstract.exception';
import { ExceptionCode } from './exception-code';

export class TestException extends AbstractException {
  constructor(message: string, exceptionCodes: ExceptionCode[] = []) {
    super(message, exceptionCodes);
  }
}

describe('Exceptions', () => {
  describe('AbstractException', () => {
    it('should create an instance with correct properties', () => {
      const message = 'Test message';
      const exception = new TestException(message, [ExceptionCode.DomainException]);

      expect(exception).toBeInstanceOf(AbstractException);
      expect(exception.message).toBe(message);
      expect(exception.code).toEqual(ExceptionCode.DomainException);
      expect(exception.description).toEqual('Domain Exception (DOM000)');
      expect(exception.timestamp).toBeInstanceOf(Date);
      expect(exception.toJSON()).toEqual({
        code: 'DOM000',
        description: 'Domain Exception (DOM000)',
        message: 'Test message',
        name: 'TestException',
        timestamp: exception.timestamp.toISOString(),
      });
      const expectedLog = `[Domain Exception (DOM000)]: ${message}, ${exception.timestamp}`;
      expect(expectedLog).toEqual(exception.print());
    });

    it('uses the default error code when no code is given', () => {
      const exception = new TestException('Test message');
      expect(exception.code).toBe(ExceptionCode.ErrorException);
      expect(exception.description).toBe('');
    });

    it('describes a custom code with the exception name', () => {
      class CustomException extends AbstractException {}
      const exception = new CustomException('Test message', ['CUSTOM1']);
      expect(exception.code).toBe('CUSTOM1');
      expect(exception.description).toBe('CustomException (CUSTOM1)');
    });

    it('can be created where Error.captureStackTrace does not exist', () => {
      const captureStackTrace = Error.captureStackTrace;
      Reflect.deleteProperty(Error, 'captureStackTrace');
      try {
        const exception = new TestException('Test message', [ExceptionCode.DomainException]);
        expect(exception.message).toBe('Test message');
        expect(typeof exception.stack).toBe('string');
      } finally {
        Error.captureStackTrace = captureStackTrace;
      }
    });
  });
});
