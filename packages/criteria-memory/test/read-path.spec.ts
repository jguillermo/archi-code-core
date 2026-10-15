import { describe, expect, it } from '@jest/globals';
import { readPath } from '../src/read-path';

describe('readPath', () => {
  it('reads top-level and nested fields', () => {
    const item = { a: 1, b: { c: { d: 'x' } } };
    expect(readPath(item, 'a')).toBe(1);
    expect(readPath(item, 'b.c.d')).toBe('x');
  });

  it('returns undefined when a parent is missing, null or not an object', () => {
    expect(readPath({ a: null }, 'a.b')).toBeUndefined();
    expect(readPath({ a: 1 }, 'a.b')).toBeUndefined();
    expect(readPath({}, 'a.b')).toBeUndefined();
    expect(readPath(null, 'a')).toBeUndefined();
  });
});
