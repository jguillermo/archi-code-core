import { scorePassword } from '../../src/helpers/scorePassword';

describe('scorePassword — numeric score of a password', () => {
  it('scores with the default weights and handles non-strings', () => {
    expect(scorePassword('Aa1!Aa1!')).toBe(46);
    expect(scorePassword('abc', { pointsPerUnique: 2, pointsForContainingLower: 0 })).toBe(6);
    expect(scorePassword(null)).toBe(0);
  });

  it('characters outside every class (e.g. CJK) count for nothing', () => {
    expect(scorePassword('中中中中中中中中')).toBe(1 + 7 * 0.5);
  });

  it('should score passwords', () => {
    const options = {
      pointsPerUnique: 1,
      pointsPerRepeat: 0.5,
      pointsForContainingLower: 10,
      pointsForContainingUpper: 10,
      pointsForContainingNumber: 10,
      pointsForContainingSymbol: 10,
    };
    const expected: Record<string, number> = {
      abc: 13,
      abcc: 13.5,
      aBc: 23,
      'Abc123!': 47,
      '!@#$%^&*()': 20,
    };
    for (const [input, score] of Object.entries(expected)) {
      expect({ input, score: scorePassword(input, options) }).toEqual({ input, score });
    }
  });
});
