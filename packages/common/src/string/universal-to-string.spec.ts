import { expect, it } from '@jest/globals';
import { universalToString } from './universal-to-string';

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
  ].forEach(([input, expected]) => {
    expect(universalToString(input)).toEqual(expected);
  });
});
