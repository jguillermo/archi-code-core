import { describe, expect, it } from 'vitest';
import { CreatedAt } from '../../../src/domain/index';
import { CriteriaError } from '../../../src/shared/criteria/criteria-error';
import { isValueObject, readValue } from '../../../src/shared/criteria/value-object-input';
import { UserAge, UserName } from './support/user';

describe('isValueObject', () => {
  it('recognizes value objects and nothing else', () => {
    expect(isValueObject(new UserName('Ana'))).toBe(true);
    expect(isValueObject(new CreatedAt(new Date(0)))).toBe(true);
    expect(isValueObject({ value: 'Ana' })).toBe(false);
    expect(isValueObject(new Date(0))).toBe(false);
    expect(isValueObject('Ana')).toBe(false);
  });
});

describe('readValue', () => {
  it('reads the value a value object holds, null included', () => {
    expect(readValue(new UserAge(30), 'age', 'value-objects')).toBe(30);
    expect(readValue(new UserAge(null), 'age', 'value-objects')).toBeNull();
  });

  it('refuses a primitive where a value object is expected', () => {
    expect(() => readValue(30, 'age', 'value-objects')).toThrow(CriteriaError);
    expect(() => readValue({ value: 30 }, 'age', 'value-objects')).toThrow(
      'Field "age" needs a value object',
    );
  });

  it('passes primitives through when the input comes from outside', () => {
    expect(readValue('30', 'age', 'primitives')).toBe('30');
  });
});
