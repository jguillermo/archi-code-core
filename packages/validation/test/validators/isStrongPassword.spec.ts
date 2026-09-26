import test from '../cross/support/testFunctions';
import { validator } from '../../src/validators';
import { test as sanitizerTest } from '../cross/support/sanitizerTest';

describe('Validators', () => {
  it('should validate strong passwords', () => {
    test({
      validator: 'isStrongPassword',
      args: [
        {
          minLength: 8,
          minLowercase: 1,
          minUppercase: 1,
          minNumbers: 1,
          minSymbols: 1,
        },
      ],
      valid: [
        '%2%k{7BsL"M%Kd6e',
        'EXAMPLE of very long_password123!',
        'mxH_+2vs&54_+H3P',
        '+&DxJ=X7-4L8jRCD',
        'etV*p%Nr6w&H%FeF',
        '£3.ndSau_7',
        'VaLIDWith\\Symb0l',
      ],
      invalid: ['', 'password', 'hunter2', 'hello world', 'passw0rd', 'password!', 'PASSWORD!'],
    });
  });

  it('should return false for non-string inputs', () => {
    test({
      validator: 'isStrongPassword',
      invalid: [null, undefined, NaN, Infinity, -Infinity, {}, [], [1, 2, 3]],
    });
  });
});

describe('#18 isStrongPassword — Unicode aware', () => {
  it('ñ/Ñ are letters, € ¿ are symbols', () => {
    expect(validator.isStrongPassword('Ñandú1€x')).toBe(true);
    expect(validator.isStrongPassword('ñandú12¿A')).toBe(true);
  });
  it('length counts characters (code points), not UTF-16 units', () => {
    // 7 characters, one of them astral: must fail minLength 8
    expect(validator.isStrongPassword('Aa1!😀bc')).toBe(false);
    expect(validator.isStrongPassword('Aa1!😀bcd')).toBe(true);
  });
});

describe('isStrongPassword — always a boolean', () => {
  it('never returns a score, even with the removed returnScore option', () => {
    const legacy = { returnScore: true } as Parameters<typeof validator.isStrongPassword>[1];
    expect(validator.isStrongPassword('Aa1!Aa1!', legacy)).toBe(true);
    expect(validator.isStrongPassword('中中中中中中中中', legacy)).toBe(false);
  });
});

describe('Sanitizers', () => {
  it('should score passwords with default options', () => {
    sanitizerTest({
      sanitizer: 'isStrongPassword',
      expect: {
        abc: false,
        abcc: false,
        aBc: false,
        'Abc123!': false,
        '!@#$%^&*()': false,
        'abc123!@f#rA': true,
      },
    });
  });
});
