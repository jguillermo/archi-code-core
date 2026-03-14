import { describe, it } from '@jest/globals';
import { invalid, valid } from './helpers';

const V4 = '550e8400-e29b-41d4-a716-446655440000';
const V7 = '018f5e8a-de5c-7000-8000-000000000000';

describe('isUuid', () => {
  describe('valid UUIDs', () => {
    it('v4 uuid', () => valid(V4, 'isUuid'));
    it('v7 uuid', () => valid(V7, 'isUuid'));
    it('uppercase uuid', () => valid(V4.toUpperCase(), 'isUuid'));
    it('without hyphens — uuid crate accepts this format', () =>
      valid('550e8400e29b41d4a716446655440000', 'isUuid'));
  });

  describe('invalid UUIDs', () => {
    it('too short', () => invalid('550e8400-e29b-41d4-a716', 'isUuid'));
    it('random string', () => invalid('not-a-uuid', 'isUuid'));
    it('empty string', () => invalid('', 'isUuid'));
  });

  describe('wrong value types', () => {
    it('number', () => invalid(123, 'isUuid'));
    it('null', () => invalid(null, 'isUuid'));
    it('object', () => invalid({}, 'isUuid'));
    it('array', () => invalid([V4], 'isUuid'));
    it('boolean', () => invalid(true, 'isUuid'));
  });
});

describe('isUuidV4', () => {
  describe('valid', () => {
    it('correct v4', () => valid(V4, 'isUuidV4'));
    it('uppercase v4', () => valid(V4.toUpperCase(), 'isUuidV4'));
  });

  describe('invalid', () => {
    it('v7 uuid fails v4 check', () => invalid(V7, 'isUuidV4'));
    it('v1 uuid', () => invalid('550e8400-e29b-11d4-a716-446655440000', 'isUuidV4'));
    it('empty string', () => invalid('', 'isUuidV4'));
    it('random string', () => invalid('not-a-uuid', 'isUuidV4'));
  });

  describe('wrong value types', () => {
    it('number', () => invalid(123, 'isUuidV4'));
    it('null', () => invalid(null, 'isUuidV4'));
    it('object', () => invalid({}, 'isUuidV4'));
    it('boolean', () => invalid(false, 'isUuidV4'));
  });
});

describe('isUuidV7', () => {
  describe('valid', () => {
    it('correct v7', () => valid(V7, 'isUuidV7'));
  });

  describe('invalid', () => {
    it('v4 uuid fails v7 check', () => invalid(V4, 'isUuidV7'));
    it('empty string', () => invalid('', 'isUuidV7'));
    it('random string', () => invalid('not-a-uuid', 'isUuidV7'));
  });

  describe('wrong value types', () => {
    it('number', () => invalid(123, 'isUuidV7'));
    it('null', () => invalid(null, 'isUuidV7'));
    it('object', () => invalid({}, 'isUuidV7'));
  });
});
