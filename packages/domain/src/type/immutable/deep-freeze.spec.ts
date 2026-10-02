import { describe, expect, it } from '@jest/globals';
import { deepFreeze } from './deep-freeze';

describe('deepFreeze', () => {
  it('returns the same value', () => {
    const value = { a: 1 };
    expect(deepFreeze(value)).toBe(value);
  });

  it('freezes an object and everything inside it', () => {
    const value = { user: { name: 'Ana', tags: ['a', { kind: 'b' }] } };
    deepFreeze(value);
    expect(Object.isFrozen(value)).toBe(true);
    expect(Object.isFrozen(value.user)).toBe(true);
    expect(Object.isFrozen(value.user.tags)).toBe(true);
    expect(Object.isFrozen(value.user.tags[1])).toBe(true);
  });

  it('freezes an array and its items', () => {
    const value = [{ a: 1 }, [2]];
    deepFreeze(value);
    expect(Object.isFrozen(value)).toBe(true);
    expect(Object.isFrozen(value[0])).toBe(true);
    expect(Object.isFrozen(value[1])).toBe(true);
  });

  it('makes changes throw in strict mode', () => {
    const value = deepFreeze({ user: { name: 'Ana' } });
    expect(() => {
      value.user.name = 'Eva';
    }).toThrow(TypeError);
  });

  it('handles circular references', () => {
    const value: { self?: unknown } = {};
    value.self = value;
    expect(() => deepFreeze(value)).not.toThrow();
    expect(Object.isFrozen(value)).toBe(true);
  });

  it('stops at an already frozen value', () => {
    const inner = { a: 1 };
    const outer = Object.freeze({ inner });
    deepFreeze(outer);
    expect(Object.isFrozen(inner)).toBe(false);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a number', 1],
    ['a string', 'a'],
    ['a boolean', true],
  ])('returns %s as it is', (_, value) => {
    expect(deepFreeze(value)).toBe(value);
  });
});
