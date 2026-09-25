import test from '../cross/support/testFunctions';
import { validator } from '../../src/validators';
import { scorePassword } from '../../src/validators/isStrongPassword';
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
  it('characters outside every class (e.g. CJK) count for nothing', () => {
    expect(validator.isStrongPassword('中中中中中中中中', { returnScore: true })).toBe(1 + 7 * 0.5);
  });
});

describe('scorePassword — numeric score without overloading isStrongPassword', () => {
  it('matches the deprecated returnScore path and handles non-strings', () => {
    expect(scorePassword('Aa1!Aa1!')).toBe(
      validator.isStrongPassword('Aa1!Aa1!', { returnScore: true }),
    );
    expect(scorePassword('abc', { pointsPerUnique: 2, pointsForContainingLower: 0 })).toBe(6);
    expect(scorePassword(null)).toBe(0);
  });
});

describe('Sanitizers', () => {
  it('should score passwords', () => {
    sanitizerTest({
      sanitizer: 'isStrongPassword',
      args: [
        {
          returnScore: true,
          pointsPerUnique: 1,
          pointsPerRepeat: 0.5,
          pointsForContainingLower: 10,
          pointsForContainingUpper: 10,
          pointsForContainingNumber: 10,
          pointsForContainingSymbol: 10,
        },
      ],
      expect: {
        abc: 13,
        abcc: 13.5,
        aBc: 23,
        'Abc123!': 47,
        '!@#$%^&*()': 20,
      },
    });
  });

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
