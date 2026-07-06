import test from '../testFunctions';

describe('Validators', () => {
  it('should validate BIC codes', () => {
    test({
      validator: 'isBIC',
      valid: ['SBICKEN1345', 'SBICKEN1', 'SBICKENY', 'SBICKEN1YYP', 'SBICXKN1YYP'],
      invalid: [
        'SBIC23NXXX',
        'S23CKENXXXX',
        'SBICKENXX',
        'SBICKENXX9',
        'SBICKEN13458',
        'SBICKEN',
        'SBICXK',
      ],
    });
  });

  it('should return false for non-string inputs', () => {
    test({
      validator: 'isBIC',
      invalid: [null, undefined, NaN, Infinity, -Infinity, {}, [], [1, 2, 3]],
    });
  });
});
