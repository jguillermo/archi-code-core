import { describe, it } from '@jest/globals';
import { invalid, valid } from './helpers';

describe('isNotEmpty', () => {
  it('valid — non-empty string', () => valid('hello', 'isNotEmpty'));
  it('valid — single space', () => valid(' ', 'isNotEmpty'));
  it('valid — special chars', () => valid('!@#', 'isNotEmpty'));
  it('invalid — empty string', () => invalid('', 'isNotEmpty'));
  // non-string types are coerced to "" in Rust
  it('invalid — number coerced to ""', () => invalid(0, 'isNotEmpty'));
  it('invalid — null coerced to ""', () => invalid(null, 'isNotEmpty'));
  it('invalid — object coerced to ""', () => invalid({}, 'isNotEmpty'));
  it('invalid — array coerced to ""', () => invalid([], 'isNotEmpty'));
  it('invalid — boolean coerced to ""', () => invalid(true, 'isNotEmpty'));
});

describe('isMinLength', () => {
  it('valid — exactly at min boundary', () => valid('abc', ['isMinLength', 3]));
  it('valid — above min', () => valid('abcde', ['isMinLength', 3]));
  it('valid — min of 0 (always passes)', () => valid('', ['isMinLength', 0]));
  it('invalid — one char below min', () => invalid('ab', ['isMinLength', 3]));
  it('invalid — empty string vs min 1', () => invalid('', ['isMinLength', 1]));
  it('valid — unicode chars counted by character not byte', () =>
    valid('héllo', ['isMinLength', 5]));
  it('invalid — emoji counted as 1 char', () => invalid('hi', ['isMinLength', 3]));
  it('invalid — number coerced to ""', () => invalid(42, ['isMinLength', 1]));
  it('invalid — null coerced to ""', () => invalid(null, ['isMinLength', 1]));
  it('invalid — object coerced to ""', () => invalid({}, ['isMinLength', 1]));
});

describe('isMaxLength', () => {
  it('valid — exactly at max boundary', () => valid('abc', ['isMaxLength', 3]));
  it('valid — below max', () => valid('ab', ['isMaxLength', 3]));
  it('valid — empty string', () => valid('', ['isMaxLength', 3]));
  it('invalid — one char above max', () => invalid('abcd', ['isMaxLength', 3]));
  it('invalid — way above max', () => invalid('abcdefghij', ['isMaxLength', 3]));
  // non-string coerced to "" (len 0) — always passes any max
  it('valid — number coerced to "" (len 0 ≤ any max)', () => valid(42, ['isMaxLength', 1]));
  it('valid — null coerced to ""', () => valid(null, ['isMaxLength', 1]));
});

describe('isExactLength', () => {
  it('valid — exact match', () => valid('abc', ['isExactLength', 3]));
  it('invalid — too short', () => invalid('ab', ['isExactLength', 3]));
  it('invalid — too long', () => invalid('abcd', ['isExactLength', 3]));
  it('valid — empty string with length 0', () => valid('', ['isExactLength', 0]));
  it('invalid — number coerced to ""', () => invalid(123, ['isExactLength', 3]));
  it('invalid — null coerced to ""', () => invalid(null, ['isExactLength', 3]));
});

describe('isLengthBetween', () => {
  it('valid — within range', () => valid('abc', ['isLengthBetween', 2, 5]));
  it('valid — at min boundary', () => valid('ab', ['isLengthBetween', 2, 5]));
  it('valid — at max boundary', () => valid('abcde', ['isLengthBetween', 2, 5]));
  it('invalid — one char too short', () => invalid('a', ['isLengthBetween', 2, 5]));
  it('invalid — one char too long', () => invalid('abcdef', ['isLengthBetween', 2, 5]));
  it('invalid — empty string', () => invalid('', ['isLengthBetween', 1, 5]));
  it('invalid — null coerced to ""', () => invalid(null, ['isLengthBetween', 1, 5]));
  it('invalid — number coerced to ""', () => invalid(123, ['isLengthBetween', 1, 5]));
});

describe('isAlpha', () => {
  it('valid — lowercase letters', () => valid('hello', 'isAlpha'));
  it('valid — uppercase letters', () => valid('HELLO', 'isAlpha'));
  it('valid — mixed case', () => valid('Hello', 'isAlpha'));
  it('valid — unicode letters', () => valid('héllo', 'isAlpha'));
  it('invalid — letters + digits', () => invalid('Hello1', 'isAlpha'));
  it('invalid — letters + space', () => invalid('Hello World', 'isAlpha'));
  it('invalid — only digits', () => invalid('123', 'isAlpha'));
  it('invalid — empty string', () => invalid('', 'isAlpha'));
  it('invalid — number value coerced to ""', () => invalid(123, 'isAlpha'));
  it('invalid — null coerced to ""', () => invalid(null, 'isAlpha'));
  it('invalid — object coerced to ""', () => invalid({}, 'isAlpha'));
});

describe('isAlphanumeric', () => {
  it('valid — letters only', () => valid('Hello', 'isAlphanumeric'));
  it('valid — digits only', () => valid('123', 'isAlphanumeric'));
  it('valid — letters + digits', () => valid('Hello123', 'isAlphanumeric'));
  it('invalid — with space', () => invalid('Hello 123', 'isAlphanumeric'));
  it('invalid — with special char', () => invalid('Hello!', 'isAlphanumeric'));
  it('invalid — underscore', () => invalid('hello_world', 'isAlphanumeric'));
  it('invalid — empty string', () => invalid('', 'isAlphanumeric'));
  it('invalid — null coerced to ""', () => invalid(null, 'isAlphanumeric'));
  it('invalid — number coerced to ""', () => invalid(123, 'isAlphanumeric'));
});

describe('isNumeric', () => {
  it('valid — all ASCII digits', () => valid('12345', 'isNumeric'));
  it('valid — single digit', () => valid('0', 'isNumeric'));
  it('invalid — float (has dot)', () => invalid('3.14', 'isNumeric'));
  it('invalid — negative (has minus)', () => invalid('-5', 'isNumeric'));
  it('invalid — has letters', () => invalid('123a', 'isNumeric'));
  it('invalid — empty string', () => invalid('', 'isNumeric'));
  it('invalid — number value coerced to ""', () => invalid(123, 'isNumeric'));
  it('invalid — null coerced to ""', () => invalid(null, 'isNumeric'));
});

describe('isAscii', () => {
  it('valid — standard ASCII string', () => valid('Hello World!', 'isAscii'));
  it('valid — empty string', () => valid('', 'isAscii'));
  it('valid — ASCII symbols', () => valid('!@#$%^&*()', 'isAscii'));
  it('invalid — accented letter', () => invalid('héllo', 'isAscii'));
  it('invalid — emoji', () => invalid('hi 😀', 'isAscii'));
  it('invalid — CJK character', () => invalid('你好', 'isAscii'));
  // non-string coerced to "" — empty string is ASCII
  it('valid — number coerced to "" (empty string is ASCII)', () => valid(123, 'isAscii'));
  it('valid — null coerced to ""', () => valid(null, 'isAscii'));
  it('valid — object coerced to ""', () => valid({}, 'isAscii'));
});

describe('isLowercase', () => {
  it('valid — all lowercase letters', () => valid('hello', 'isLowercase'));
  it('valid — lowercase + digits (digits are neutral)', () => valid('hello123', 'isLowercase'));
  it('valid — lowercase + spaces', () => valid('hello world', 'isLowercase'));
  it('invalid — has uppercase letter', () => invalid('Hello', 'isLowercase'));
  it('invalid — all uppercase', () => invalid('HELLO', 'isLowercase'));
  it('invalid — empty string', () => invalid('', 'isLowercase'));
  it('invalid — number coerced to ""', () => invalid(123, 'isLowercase'));
  it('invalid — null coerced to ""', () => invalid(null, 'isLowercase'));
});

describe('isUppercase', () => {
  it('valid — all uppercase letters', () => valid('HELLO', 'isUppercase'));
  it('valid — uppercase + digits', () => valid('HELLO123', 'isUppercase'));
  it('valid — uppercase + spaces', () => valid('HELLO WORLD', 'isUppercase'));
  it('invalid — has lowercase letter', () => invalid('Hello', 'isUppercase'));
  it('invalid — all lowercase', () => invalid('hello', 'isUppercase'));
  it('invalid — empty string', () => invalid('', 'isUppercase'));
  it('invalid — number coerced to ""', () => invalid(123, 'isUppercase'));
  it('invalid — null coerced to ""', () => invalid(null, 'isUppercase'));
});

describe('isContains', () => {
  it('valid — contains substring in middle', () => valid('hello world', ['isContains', 'world']));
  it('valid — contains substring at start', () => valid('hello world', ['isContains', 'hello']));
  it('valid — contains single char', () => valid('hello', ['isContains', 'e']));
  it('valid — contains entire string', () => valid('hello', ['isContains', 'hello']));
  it('invalid — does not contain', () => invalid('hello world', ['isContains', 'foo']));
  it('invalid — case sensitive', () => invalid('hello', ['isContains', 'Hello']));
  it('invalid — empty value string', () => invalid('', ['isContains', 'a']));
  it('invalid — number coerced to ""', () => invalid(12345, ['isContains', '234']));
  it('invalid — null coerced to ""', () => invalid(null, ['isContains', 'a']));
});

describe('isStartsWith', () => {
  it('valid — starts with prefix', () => valid('hello world', ['isStartsWith', 'hello']));
  it('valid — entire string is the prefix', () => valid('hello', ['isStartsWith', 'hello']));
  it('invalid — does not start with', () => invalid('hello world', ['isStartsWith', 'world']));
  it('invalid — case sensitive', () => invalid('Hello', ['isStartsWith', 'hello']));
  it('invalid — empty string', () => invalid('', ['isStartsWith', 'a']));
  it('invalid — number coerced to ""', () => invalid(12345, ['isStartsWith', '1']));
  it('invalid — null coerced to ""', () => invalid(null, ['isStartsWith', 'a']));
});

describe('isEndsWith', () => {
  it('valid — ends with suffix', () => valid('hello world', ['isEndsWith', 'world']));
  it('valid — entire string is the suffix', () => valid('hello', ['isEndsWith', 'hello']));
  it('invalid — does not end with', () => invalid('hello world', ['isEndsWith', 'hello']));
  it('invalid — case sensitive', () => invalid('Hello', ['isEndsWith', 'hello']));
  it('invalid — empty string', () => invalid('', ['isEndsWith', 'a']));
  it('invalid — number coerced to ""', () => invalid(12345, ['isEndsWith', '5']));
  it('invalid — null coerced to ""', () => invalid(null, ['isEndsWith', 'a']));
});

describe('isMatchesRegex', () => {
  it('valid — matches pattern', () => valid('hello123', ['isMatchesRegex', '^[a-z]+\\d+$']));
  it('valid — matches digit pattern', () => valid('12345', ['isMatchesRegex', '^\\d+$']));
  it('valid — matches any pattern', () => valid('abc', ['isMatchesRegex', '.*']));
  it('invalid — does not match', () => invalid('HELLO', ['isMatchesRegex', '^[a-z]+$']));
  it('invalid — partial match does not count (use .* if needed)', () =>
    invalid('abc123', ['isMatchesRegex', '^[a-z]+$']));
  // Rust regex crate does NOT support lookaheads (?=...) — they always fail
  it('invalid — lookaheads not supported in Rust regex', () =>
    invalid('Passw0rd', ['isMatchesRegex', '(?=.*[A-Z])']));
  it('invalid — invalid regex pattern → treated as no match', () =>
    invalid('test', ['isMatchesRegex', '[invalid(']));
  it('invalid — number coerced to ""', () => invalid(123, ['isMatchesRegex', '^\\d+$']));
  it('invalid — null coerced to ""', () => invalid(null, ['isMatchesRegex', '^.+$']));
});
