import { describe, expect, it } from 'vitest';
import { ValueObjectBrand } from '../../../src/shared/value-object/value-object-brand';
import { CreatedAt } from '../../../src/domain/type/date-type';
import { EnumType } from '../../../src/domain/type/enum-type';
import { IdType } from '../../../src/domain/type/id-type';
import { JsonType } from '../../../src/domain/type/json-type';
import { StringType } from '../../../src/domain/type/string-type';

class CustomerEmail extends StringType {}

describe('ValueObjectBrand', () => {
  it('recognizes value objects by their brand, also those of another build', () => {
    expect(ValueObjectBrand.isValueObject(new CustomerEmail('ana@example.com'))).toBe(true);
    expect(
      ValueObjectBrand.isValueObject({ [Symbol.for('@archi-code/ddd/value-object.v1')]: true }),
    ).toBe(true);
    expect(ValueObjectBrand.isValueObject({ value: 'ana@example.com' })).toBe(false);
    expect(ValueObjectBrand.isValueObject(null)).toBe(false);
    expect(ValueObjectBrand.isValueObject('ana@example.com')).toBe(false);
  });

  it('gives the kind every subclass inherits from its base type', () => {
    expect(ValueObjectBrand.kindOf(CustomerEmail)).toBe('string');
    expect(ValueObjectBrand.kindOf(IdType)).toBe('string');
    expect(ValueObjectBrand.kindOf(CreatedAt)).toBe('date');
    expect(ValueObjectBrand.kindOf(EnumType)).toBe('enum');
  });

  it('has no kind for a value object that holds an object, a plain class or something else', () => {
    expect(ValueObjectBrand.kindOf(JsonType)).toBeNull();
    expect(ValueObjectBrand.kindOf(Date)).toBeNull();
    expect(ValueObjectBrand.kindOf('StringType')).toBeNull();
  });
});
