import { describe, it } from '@jest/globals';
import { splitString, testValidation, titleGenerate, toEqualArray } from './util-test';

describe('Util Test', () => {
  it('splitString', () => {
    toEqualArray([
      [splitString('abc:def'), { name: 'abc', property: 'def' }],
      [splitString('abc:'), { name: 'abc', property: null }],
      [splitString('abc'), { name: 'abc', property: null }],
      [splitString(':def'), { name: null, property: 'def' }],
      [splitString(':'), { name: null, property: null }],
      [splitString(''), { name: null, property: null }],
    ]);
  });
  it('titleGenerate', () => {
    toEqualArray([
      //function
      [titleGenerate('abc', 1, 1, true), 'validate abc(1) toEqual 1'],
      [titleGenerate('abc', '1', 1, true), "validate abc('1') toEqual 1"],
      [titleGenerate('abc', '1', '1', true), "validate abc('1') toEqual '1'"],
      [titleGenerate('abc', null, 1, false), 'validate abc() toEqual 1'],
      [titleGenerate('abc', null, '1', false), "validate abc() toEqual '1'"],
      //error function
      [titleGenerate('abc', 1, 1, true, 1), 'abc(1) Expected: 1, but return: 1'],
      [titleGenerate('abc', '1', 1, true, 1), "abc('1') Expected: 1, but return: 1"],
      [titleGenerate('abc', '1', '1', true, 1), "abc('1') Expected: '1', but return: 1"],
      [titleGenerate('abc', null, 1, false, 1), 'abc() Expected: 1, but return: 1'],
      [titleGenerate('abc', null, '1', false, 1), "abc() Expected: '1', but return: 1"],

      //function:properties
      [titleGenerate('abc:def', 1, 1, true), 'validate (new abc(1)).def() toEqual 1'],
      [titleGenerate('abc:def', '1', 1, true), "validate (new abc('1')).def() toEqual 1"],
      [titleGenerate('abc:def', '1', '1', true), "validate (new abc('1')).def() toEqual '1'"],
      [titleGenerate('abc:def', null, 1, false), 'validate (new abc()).def() toEqual 1'],
      [titleGenerate('abc:def', null, '1', false), "validate (new abc()).def() toEqual '1'"],
      //error function:properties
      [titleGenerate('abc:def', 1, 1, true, 1), '(new abc(1)).def() Expected: 1, but return: 1'],
      [
        titleGenerate('abc:def', '1', 1, true, 1),
        "(new abc('1')).def() Expected: 1, but return: 1",
      ],
      [
        titleGenerate('abc:def', '1', '1', true, 1),
        "(new abc('1')).def() Expected: '1', but return: 1",
      ],
      [titleGenerate('abc:def', null, 1, false, 1), '(new abc()).def() Expected: 1, but return: 1'],
      [
        titleGenerate('abc:def', null, '1', false, 1),
        "(new abc()).def() Expected: '1', but return: 1",
      ],
    ]);
  });
  describe('testValidation', () => {
    testValidation({
      validator: (value: any) => value === true,
      valid: [true],
      invalid: [false, 1, 0],
    });
  });
});
