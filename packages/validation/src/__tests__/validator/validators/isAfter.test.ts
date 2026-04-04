import isAfter from '../../../validators/isAfter';

describe('isAfter', () => {
  it('validates dates after a comparisonDate', () => {
    expect(isAfter('2011-08-04', { comparisonDate: '2011-08-03' })).toBe(true);
    expect(isAfter(new Date(2011, 8, 10).toString(), { comparisonDate: '2011-08-03' })).toBe(true);

    expect(isAfter('2010-07-02', { comparisonDate: '2011-08-03' })).toBe(false);
    expect(isAfter('2011-08-03', { comparisonDate: '2011-08-03' })).toBe(false);
    expect(isAfter(new Date(0).toString(), { comparisonDate: '2011-08-03' })).toBe(false);
    expect(isAfter('foo', { comparisonDate: '2011-08-03' })).toBe(false);
  });

  it('validates dates after now when no comparisonDate is given', () => {
    expect(isAfter('2100-08-04')).toBe(true);
    expect(isAfter(new Date(Date.now() + 86400000).toString())).toBe(true);

    expect(isAfter('2010-07-02')).toBe(false);
    expect(isAfter(new Date(0).toString())).toBe(false);
  });

  it('returns false for invalid date strings', () => {
    expect(isAfter('invalid date', { comparisonDate: '2011-08-03' })).toBe(false);
    expect(isAfter('2015-09-17', { comparisonDate: 'invalid date' })).toBe(false);
    expect(isAfter('invalid date', { comparisonDate: 'invalid date' })).toBe(false);
  });

  it('falls back to current date with empty args, undefined, or undefined comparisonDate', () => {
    expect(isAfter('2100-08-04', undefined)).toBe(true);
    expect(isAfter(new Date(Date.now() + 86400000).toString(), undefined)).toBe(true);
    expect(isAfter('2100-08-04', { comparisonDate: undefined })).toBe(true);
    expect(isAfter(new Date(Date.now() + 86400000).toString(), { comparisonDate: undefined })).toBe(true);
  });

  describe('legacy syntax (string as second argument)', () => {
    it('validates dates after a comparison date string', () => {
      expect(isAfter('2011-08-04', '2011-08-03')).toBe(true);
      expect(isAfter(new Date(2011, 8, 10).toString(), '2011-08-03')).toBe(true);

      expect(isAfter('2010-07-02', '2011-08-03')).toBe(false);
      expect(isAfter('2011-08-03', '2011-08-03')).toBe(false);
      expect(isAfter(new Date(0).toString(), '2011-08-03')).toBe(false);
      expect(isAfter('foo', '2011-08-03')).toBe(false);
    });

    it('validates dates after now when no second argument is given', () => {
      expect(isAfter('2100-08-04')).toBe(true);
      expect(isAfter(new Date(Date.now() + 86400000).toString())).toBe(true);

      expect(isAfter('2010-07-02')).toBe(false);
      expect(isAfter(new Date(0).toString())).toBe(false);
    });

    it('returns false for invalid date strings', () => {
      expect(isAfter('invalid date', '2011-08-03')).toBe(false);
      expect(isAfter('invalid date', 'invalid date')).toBe(false);
      expect(isAfter('2015-09-17', 'invalid date')).toBe(false);
    });
  });
});
