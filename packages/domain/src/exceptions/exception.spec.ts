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
      //const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
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
  });
});
