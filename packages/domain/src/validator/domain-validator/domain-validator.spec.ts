import { describe, expect, it } from '@jest/globals';
import { validate, Validate } from 'class-validator';

import { DomainValidator } from './domain-validator';
import { AddValidate } from '../decorator/type-validator';
import { StringTypeRequired } from '../../type';

@AddValidate([{ validator: 'MinLength', value: 5 }])
class CourseTitle extends StringTypeRequired {}

class EntityValidateTest {
  @Validate(DomainValidator, [CourseTitle])
  public name?: string;
}

describe('validate DomainValidator CourseTitle', () => {
  describe('primitive properties', () => {
    it('null', async () => {
      const object = new EntityValidateTest();
      const errors = await validate(object);
      expect(errors.length).toEqual(1);
      expect(errors[0].constraints).toEqual({
        domainValidator:
          'must be a string, should not be empty, must be longer than or equal to 5 characters',
      });
    });
    it('invalid value 123', async () => {
      const object = new EntityValidateTest();
      object.name = '123';
      const errors = await validate(object);
      expect(errors.length).toEqual(1);
      expect(errors[0].constraints).toEqual({
        domainValidator: 'must be longer than or equal to 5 characters',
      });
    });
    it('invalid value symbol try show exception', async () => {
      const object = new EntityValidateTest();
      object.name = Symbol('test') as any;
      const errors = await validate(object);
      expect(errors.length).toEqual(1);
      expect(errors[0].constraints).toEqual({
        domainValidator: 'Validation Error: Expected a valid String, but received Symbol(test).',
      });
    });
    it('valid value', async () => {
      const object = new EntityValidateTest();
      object.name = 'valid value';
      const errors = await validate(object);
      expect(errors.length).toEqual(0);
    });
  });
});
