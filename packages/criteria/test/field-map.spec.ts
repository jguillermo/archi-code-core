import { describe, expect, it } from '@jest/globals';
import { FieldMap, mapField } from '../src/field-map';
import { UserPrimitives } from './support/user';

describe('mapField', () => {
  const fields: FieldMap<UserPrimitives> = { id: '_id', 'address.city': 'addr.city' };

  it('renames mapped fields and keeps the rest', () => {
    expect(mapField(fields, 'id')).toBe('_id');
    expect(mapField(fields, 'address.city')).toBe('addr.city');
    expect(mapField(fields, 'name')).toBe('name');
    expect(mapField(undefined, 'id')).toBe('id');
  });

  it('ignores inherited properties', () => {
    expect(mapField(fields, 'toString')).toBe('toString');
  });
});
