import { describe, expect, it } from '@jest/globals';
import { ExceptionCode } from '../exception-code';
import { AggregateNotFoundException } from './aggregate-not-found.exception';
import { DomainException } from './domain.exception';
import { ValidationException } from './validation.exception';
import { TypePrimitiveException } from './type-primitive.exception';

describe('DomainException', () => {
  describe('AggregateNotFoundException', () => {
    it('should create an instance with correct properties', () => {
      const aggregateName = 'User';
      const aggregateId = '123';
      const message = `User with ID 123 not found.`;
      const exception = new AggregateNotFoundException(aggregateName, aggregateId);

      expect(exception).toBeInstanceOf(AggregateNotFoundException);
      expect(exception.message).toBe(message);
      expect(exception.code).toEqual(ExceptionCode.AggregateNotFound);
      expect(exception.description).toEqual(
        'Domain Exception (DOM000), Aggregate Not Found (DOM002)',
      );
      expect(exception.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('TypePrimitiveException', () => {
    it('validation exception error', () => {
      const message = `Validation Error: Expected a valid string, but received [1,2].`;
      const exception = new TypePrimitiveException('string', [1, 2]);

      expect(exception).toBeInstanceOf(TypePrimitiveException);
      expect(exception.message).toBe(message);
      expect(exception.code).toEqual(ExceptionCode.TypeFailed);
      expect(exception.description).toEqual('Domain Exception (DOM000), Type Failed (DOM003)');
      expect(exception.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('ValidationException', () => {
    it('should create an instance with correct properties', () => {
      const errors = ['Field1 is required', 'Field2 must be a number'];
      const message = `Validation failed, Field1 is required, Field2 must be a number`;
      const exception = new ValidationException(errors);

      expect(exception).toBeInstanceOf(ValidationException);
      expect(exception.message).toBe(message);
      expect(exception.code).toEqual(ExceptionCode.ValidationFailed);
      expect(exception.description).toEqual(
        'Domain Exception (DOM000), Validation Failed (DOM001)',
      );
      expect(exception.timestamp).toBeInstanceOf(Date);
    });
  });
  describe('DomainException', () => {
    it('should create an instance with correct properties', () => {
      const message = 'Domain error';
      const exception = new DomainException(message);

      expect(exception).toBeInstanceOf(DomainException);
      expect(exception.message).toBe(message);
      expect(exception.code).toEqual(ExceptionCode.DomainException);
      expect(exception.description).toEqual('Domain Exception (DOM000)');
      expect(exception.timestamp).toBeInstanceOf(Date);
    });
  });
});
