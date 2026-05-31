import test from '../testFunctions';

describe('Validators', () => {
  it('should validate ISO 4217 corrency codes', () => {
    // from https://en.wikipedia.org/wiki/ISO_4217
    test({
      validator: 'isISO4217',
      valid: [
        'AED',
        'aed',
        'AUD',
        'CUP',
        'EUR',
        'GBP',
        'LYD',
        'MYR',
        'SGD',
        'SLE',
        'USD',
        'VED',
        'SLE',
      ],
      invalid: ['', '$', 'US', 'us', 'AAA', 'aaa', 'RWA', 'EURO', 'euro', 'HRK', 'CUC'],
    });
  });

  it('should return false for non-string inputs', () => {
    test({
      validator: 'isISO4217',
      invalid: [null, undefined, NaN, Infinity, -Infinity, {}, [], [1, 2, 3]],
    });
  });
});
