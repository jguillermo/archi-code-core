import test from '../testFunctions';

describe('Validators', () => {
  it('should validate hex-encoded MongoDB ObjectId', () => {
    test({
      validator: 'isMongoId',
      valid: ['507f1f77bcf86cd799439011'],
      invalid: [
        '507f1f77bcf86cd7994390',
        '507f1f77bcf86cd79943901z',
        '',
        '507f1f77bcf86cd799439011 ',
      ],
    });
  });

  it('should return false for non-string inputs', () => {
    test({
      validator: 'isMongoId',
      invalid: [null, undefined, NaN, Infinity, -Infinity, {}, [], [1, 2, 3]],
    });
  });
});
