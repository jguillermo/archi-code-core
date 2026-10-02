import { describe, expect, it } from '@jest/globals';
import { expectTypeOf } from 'expect-type';
import { IdType } from './id-type';
import { UuidType } from './uuid-type';
import { TypePrimitiveException } from '../exceptions/domain/type-primitive.exception';

const V4 = 'df9ef000-21fc-4e06-b8f7-103c3a133d10';

describe('IdType', () => {
  it('is a required UUID', () => {
    expectTypeOf<ConstructorParameters<typeof IdType>>().toEqualTypeOf<[value: string]>();
    expectTypeOf<IdType['value']>().toEqualTypeOf<string>();
    expect(new IdType(V4).value).toBe(V4);
    expect(() => new IdType(null as unknown as string)).toThrow(
      'Validation Error: IdType is required, but received null.',
    );
    expect(() => new IdType('abc')).toThrow(TypePrimitiveException);
  });

  it.each([
    ['nil', '00000000-0000-0000-0000-000000000000'],
    ['max', 'ffffffff-ffff-ffff-ffff-ffffffffffff'],
    ['max in capitals', 'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF'],
  ])('rejects the %s UUID, which UuidType accepts', (_, id) => {
    expect(new UuidType(id).value).toBe(id);
    expect(() => new IdType(id)).toThrow(TypePrimitiveException);
    expect(() => new IdType(id)).toThrow(
      `Validation Error: Expected a valid Id, but received "${id}".`,
    );
  });

  it('accepts every real UUID version', () => {
    for (const id of [V4, '6ba7b810-9dad-11d1-80b4-00c04fd430c8', IdType.fromValue('hello')]) {
      expect(new IdType(id).value).toBe(id);
    }
  });

  it('is a UuidType', () => {
    expect(new IdType(IdType.random())).toBeInstanceOf(UuidType);
  });
});
