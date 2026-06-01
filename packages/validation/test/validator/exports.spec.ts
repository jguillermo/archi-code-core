import assert from 'assert';
import validator from '../../src/validators';
import * as sanitizer from '../../src/sanitizer';
import { locales as isPostalCodeLocales } from '../../src/validators/isPostalCode';
import { locales as isAlphaLocales } from '../../src/validators/isAlpha';
import { locales as isAlphanumericLocales } from '../../src/validators/isAlphanumeric';
import { locales as isMobilePhoneLocales } from '../../src/validators/isMobilePhone';
import { locales as isFloatLocales } from '../../src/validators/isFloat';
import { locales as ibanCountryCodes } from '../../src/validators/isIBAN';
import { locales as passportNumberLocales } from '../../src/validators/isPassportNumber';

describe('Exports', () => {
  it("should export isPassportNumbers's supported locales", () => {
    assert.ok(passportNumberLocales instanceof Array);
    assert.ok(validator.passportNumberLocales instanceof Array);
  });

  it('should export validators', () => {
    assert.strictEqual(typeof validator.isEmail, 'function');
    assert.strictEqual(typeof validator.isAlpha, 'function');
  });

  it('should export sanitizers', () => {
    assert.strictEqual(typeof sanitizer.toBoolean, 'function');
    assert.strictEqual(typeof sanitizer.toFloat, 'function');
  });

  it("should export isPostalCode's supported locales", () => {
    assert.ok(isPostalCodeLocales instanceof Array);
    assert.ok(validator.isPostalCodeLocales instanceof Array);
  });

  it("should export isAlpha's supported locales", () => {
    assert.ok(isAlphaLocales instanceof Array);
    assert.ok(validator.isAlphaLocales instanceof Array);
  });

  it("should export isAlphanumeric's supported locales", () => {
    assert.ok(isAlphanumericLocales instanceof Array);
    assert.ok(validator.isAlphanumericLocales instanceof Array);
  });

  it("should export isMobilePhone's supported locales", () => {
    assert.ok(isMobilePhoneLocales instanceof Array);
    assert.ok(validator.isMobilePhoneLocales instanceof Array);
  });

  it("should export isFloat's supported locales", () => {
    assert.ok(isFloatLocales instanceof Array);
    assert.ok(validator.isFloatLocales instanceof Array);
  });

  it('should export a list of country codes that implement IBAN', () => {
    assert.ok(ibanCountryCodes instanceof Array);
    assert.ok(validator.ibanLocales instanceof Array);
  });
});
