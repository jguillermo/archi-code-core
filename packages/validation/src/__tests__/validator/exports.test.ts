import assert from 'assert';
import validator from '../../validators';
import { locales as isPostalCodeLocales } from '../../validators/isPostalCode';
import { locales as isAlphaLocales } from '../../validators/isAlpha';
import { locales as isAlphanumericLocales } from '../../validators/isAlphanumeric';
import { locales as isMobilePhoneLocales } from '../../validators/isMobilePhone';
import { locales as isFloatLocales } from '../../validators/isFloat';
import { locales as ibanCountryCodes } from '../../validators/isIBAN';
import { locales as passportNumberLocales } from '../../validators/isPassportNumber';

const _require = require;

describe('Exports', () => {
  it('should export isPassportNumbers\'s supported locales', () => {
    assert.ok(passportNumberLocales instanceof Array);
    assert.ok(validator.passportNumberLocales instanceof Array);
  });

  it('should export validators', () => {
    assert.strictEqual(typeof validator.isEmail, 'function');
    assert.strictEqual(typeof validator.isAlpha, 'function');
  });

  it('should export sanitizers', () => {
    assert.strictEqual(typeof validator.toBoolean, 'function');
    assert.strictEqual(typeof validator.toFloat, 'function');
  });

  it('should export the version number', () => {
    assert.strictEqual(
      validator.version,
      _require('../package.json').version,
      'Version number mismatch in "package.json" vs. "validator.js"'
    );
  });

  it('should export isPostalCode\'s supported locales', () => {
    assert.ok(isPostalCodeLocales instanceof Array);
    assert.ok(validator.isPostalCodeLocales instanceof Array);
  });

  it('should export isAlpha\'s supported locales', () => {
    assert.ok(isAlphaLocales instanceof Array);
    assert.ok(validator.isAlphaLocales instanceof Array);
  });

  it('should export isAlphanumeric\'s supported locales', () => {
    assert.ok(isAlphanumericLocales instanceof Array);
    assert.ok(validator.isAlphanumericLocales instanceof Array);
  });

  it('should export isMobilePhone\'s supported locales', () => {
    assert.ok(isMobilePhoneLocales instanceof Array);
    assert.ok(validator.isMobilePhoneLocales instanceof Array);
  });

  it('should export isFloat\'s supported locales', () => {
    assert.ok(isFloatLocales instanceof Array);
    assert.ok(validator.isFloatLocales instanceof Array);
  });

  it('should export a list of country codes that implement IBAN', () => {
    assert.ok(ibanCountryCodes instanceof Array);
    assert.ok(validator.ibanLocales instanceof Array);
  });
});
