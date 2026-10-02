import { describe, expect, it } from '@jest/globals';
import { isMissing } from './is-missing';

describe('isMissing', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['an empty string', ''],
    ['only spaces', '   '],
    ['only tabs and line breaks', '\t\n\r\n'],
  ])('%s is missing', (_, value) => {
    expect(isMissing(value)).toBe(true);
  });

  it.each([
    ['a string with content', 'a'],
    ['a string with content and spaces', ' a '],
    ['zero', 0],
    ['NaN', NaN],
    ['false', false],
    ['an empty array', []],
    ['an empty object', {}],
  ])('%s is not missing', (_, value) => {
    expect(isMissing(value)).toBe(false);
  });
});
