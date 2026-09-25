import { expect, it } from '@jest/globals';
import { anyToString } from '../../src/convert/any-to-string';
import { anyToString as anyToStringFromIndex, toString } from '../../src/convert';

it('universalToString', () => {
  interface CircularObject {
    self?: CircularObject;
  }

  const circularObj: CircularObject = {};
  circularObj.self = circularObj;
  const largeObject = {
    id: 1,
    name: 'Object',
    metadata: {
      author: 'developer',
    },
  };

  [
    [null, 'null'],
    [undefined, 'undefined'],
    [123, '123'],
    [-Infinity, '-Infinity'],
    [Infinity, 'Infinity'],
    ['hello', 'hello'],
    [true, 'true'],
    [false, 'false'],
    [new Date('2020-01-01T00:00:00Z'), 'Date(2020-01-01T00:00:00.000Z)'],
    [[], '[]'],
    [[1, 2, 3], '[1,2,3]'],
    [{}, '{}'],
    [{ a: 1 }, '{"a":1}'],
    [
      new Map([
        [1, 'one'],
        [2, 'two'],
      ]),
      'Map({1: one, 2: two})',
    ],
    [new Set([1, 2, 3]), 'Set(1, 2, 3)'],
    [function example() {}, 'Function(example)'],
    [Symbol('sym'), 'Symbol(sym)'],
    [Promise.resolve('data promise'), 'Promise'],
    [new Error('data error'), 'new Error(data error)'],
    [largeObject, '{"id":1,"name":"Object","metadata":{"author":"developer"}}'],
    [new Error(largeObject as any), 'new Error([object Object])'],
    [new Error({} as any), 'new Error([object Object])'],
    [new Error([] as any), 'new Error()'],
    [new Error(1 as any), 'new Error(1)'],
    [new RegExp('test'), 'RegExp(/test/)'],
    [circularObj, '[Circular or too complex to stringify]'],
    [NaN, 'NaN'],
    [BigInt(10), '10'],
    [() => 1, 'Function(anonymous)'],
    // JSON.stringify returns undefined → falls back to the object's own toString
    [{ toJSON: () => undefined }, '[object Object]'],
  ].forEach(([input, expected]) => {
    expect(anyToString(input)).toEqual(expected);
  });
});

it('anyToString reuses convert/string for the values toString accepts', () => {
  expect(anyToStringFromIndex).toBe(anyToString);
  for (const v of ['', 'txt', true, false, 0, -1.5, 1e21]) {
    expect(anyToString(v)).toBe(toString(v).value);
  }
});
