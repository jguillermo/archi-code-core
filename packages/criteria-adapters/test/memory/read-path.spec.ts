import { describe, expect, it } from '@jest/globals';
import { readPath } from '../../src/memory/read-path';

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

  it('reads only own properties, never inherited ones or getters of the prototype', () => {
    class Entity {
      readonly name = 'own';

      get computed(): string {
        return this.name.toUpperCase();
      }
    }
    expect(readPath({}, 'toString')).toBeUndefined();
    expect(readPath({ a: {} }, 'a.hasOwnProperty')).toBeUndefined();
    expect(readPath(new Entity(), 'name')).toBe('own');
    expect(readPath(new Entity(), 'computed')).toBeUndefined();
  });

  it('reads list elements by index only, never a property across the list', () => {
    const item = { tags: ['x', 'y'], items: [{ name: 'p' }] };
    expect(readPath(item, 'tags.1')).toBe('y');
    expect(readPath(item, 'items.0.name')).toBe('p');
    expect(readPath(item, 'items.name')).toBeUndefined();
    expect(readPath(item, 'tags.length')).toBeUndefined();
    expect(readPath(item, 'tags.01')).toBeUndefined();
    expect(readPath(item, 'tags.5')).toBeUndefined();
  });
});
