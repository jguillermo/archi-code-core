import isBefore from '../../../validators/isBefore';

describe('isBefore', () => {
  describe('new syntax (comparisonDate option)', () => {
    it('validates dates before a given end date', () => {
      expect(isBefore('2010-07-02', { comparisonDate: '08/04/2011' })).toBe(true);
      expect(isBefore('2010-08-04', { comparisonDate: '08/04/2011' })).toBe(true);
      expect(isBefore(new Date(0).toString(), { comparisonDate: '08/04/2011' })).toBe(true);

      expect(isBefore('08/04/2011', { comparisonDate: '08/04/2011' })).toBe(false);
      expect(isBefore(new Date(2011, 9, 10).toString(), { comparisonDate: '08/04/2011' })).toBe(
        false,
      );
    });

    it('accepts a Date object as comparisonDate', () => {
      expect(isBefore('2010-07-02', { comparisonDate: new Date(2011, 7, 4).toString() })).toBe(
        true,
      );
      expect(isBefore('2010-08-04', { comparisonDate: new Date(2011, 7, 4).toString() })).toBe(
        true,
      );
      expect(
        isBefore(new Date(0).toString(), { comparisonDate: new Date(2011, 7, 4).toString() }),
      ).toBe(true);

      expect(isBefore('08/04/2011', { comparisonDate: new Date(2011, 7, 4).toString() })).toBe(
        false,
      );
      expect(
        isBefore(new Date(2011, 9, 10).toString(), {
          comparisonDate: new Date(2011, 7, 4).toString(),
        }),
      ).toBe(false);
    });

    it('returns false for invalid date strings', () => {
      expect(isBefore('invalid date', { comparisonDate: '2011-08-03' })).toBe(false);
      expect(isBefore('invalid date', { comparisonDate: 'invalid date' })).toBe(false);
      expect(isBefore('1999-12-31', { comparisonDate: 'invalid date' })).toBe(false);
    });

    it('validates a valid date against a string comparisonDate', () => {
      expect(isBefore('1999-12-31', { comparisonDate: '2011-08-03' })).toBe(true);
      expect(isBefore('invalid date', { comparisonDate: '2011-08-03' })).toBe(false);
    });
  });

  describe('legacy syntax (string as second argument)', () => {
    it('validates dates before a given end date', () => {
      expect(isBefore('2010-07-02', '08/04/2011')).toBe(true);
      expect(isBefore('2010-08-04', '08/04/2011')).toBe(true);
      expect(isBefore(new Date(0).toString(), '08/04/2011')).toBe(true);

      expect(isBefore('08/04/2011', '08/04/2011')).toBe(false);
      expect(isBefore(new Date(2011, 9, 10).toString(), '08/04/2011')).toBe(false);
    });

    it('accepts a Date string as second argument', () => {
      expect(isBefore('2010-07-02', new Date(2011, 7, 4).toString())).toBe(true);
      expect(isBefore('2010-08-04', new Date(2011, 7, 4).toString())).toBe(true);
      expect(isBefore(new Date(0).toString(), new Date(2011, 7, 4).toString())).toBe(true);

      expect(isBefore('08/04/2011', new Date(2011, 7, 4).toString())).toBe(false);
      expect(isBefore(new Date(2011, 9, 10).toString(), new Date(2011, 7, 4).toString())).toBe(
        false,
      );
    });

    it('returns false for invalid date strings', () => {
      expect(isBefore('invalid date', '2011-08-03')).toBe(false);
      expect(isBefore('invalid date', 'invalid date')).toBe(false);
      expect(isBefore('1999-12-31', 'invalid date')).toBe(false);
    });
  });

  describe('default end date (falls back to now)', () => {
    it('validates past dates as before now', () => {
      expect(isBefore('2000-08-04')).toBe(true);
      expect(isBefore(new Date(0).toString())).toBe(true);
      expect(isBefore(new Date(Date.now() - 86400000).toString())).toBe(true);

      expect(isBefore('2100-07-02')).toBe(false);
      expect(isBefore(new Date(2217, 10, 10).toString())).toBe(false);
    });

    it('falls back to now when args is undefined, empty, or comparisonDate is undefined', () => {
      expect(isBefore('1999-06-07', undefined)).toBe(true);
      expect(isBefore('1999-06-07', { comparisonDate: undefined })).toBe(true);
    });
  });
});
