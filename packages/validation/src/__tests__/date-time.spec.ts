import { describe, it } from '@jest/globals';
import { invalid, valid } from './helpers';

describe('isDate', () => {
  describe('valid dates', () => {
    it('standard YYYY-MM-DD', () => valid('2024-01-15', 'isDate'));
    it('end of year', () => valid('2024-12-31', 'isDate'));
    it('start of year', () => valid('2024-01-01', 'isDate'));
    it('leap day on leap year', () => valid('2024-02-29', 'isDate'));
    it('far future date', () => valid('2999-06-15', 'isDate'));
  });

  describe('invalid dates', () => {
    it('DD/MM/YYYY format', () => invalid('15/01/2024', 'isDate'));
    it('MM-DD-YYYY format', () => invalid('01-15-2024', 'isDate'));
    it('with time appended', () => invalid('2024-01-15T10:30:00', 'isDate'));
    it('month 13', () => invalid('2024-13-01', 'isDate'));
    it('day 32', () => invalid('2024-01-32', 'isDate'));
    it('day 0', () => invalid('2024-01-00', 'isDate'));
    it('empty string', () => invalid('', 'isDate'));
    it('plain text', () => invalid('tomorrow', 'isDate'));
  });

  describe('wrong value types', () => {
    it('number timestamp', () => invalid(20240115, 'isDate'));
    it('Date object', () => invalid(new Date(), 'isDate'));
    it('null', () => invalid(null, 'isDate'));
    it('boolean', () => invalid(true, 'isDate'));
    it('object', () => invalid({ year: 2024 }, 'isDate'));
    it('array', () => invalid(['2024-01-15'], 'isDate'));
  });
});

describe('isDatetime', () => {
  describe('valid datetime strings', () => {
    it('ISO 8601 with Z', () => valid('2024-01-15T10:30:00Z', 'isDatetime'));
    it('with positive timezone offset', () => valid('2024-01-15T10:30:00+05:00', 'isDatetime'));
    it('with negative timezone offset', () => valid('2024-01-15T10:30:00-03:00', 'isDatetime'));
    it('with milliseconds and Z', () => valid('2024-01-15T10:30:00.000Z', 'isDatetime'));
  });

  describe('invalid datetime strings', () => {
    it('date only — missing time', () => invalid('2024-01-15', 'isDatetime'));
    it('time only', () => invalid('10:30:00', 'isDatetime'));
    it('invalid separator', () => invalid('2024-01-15 10:30:00', 'isDatetime'));
    it('empty string', () => invalid('', 'isDatetime'));
    it('plain text', () => invalid('now', 'isDatetime'));
  });

  describe('wrong value types', () => {
    it('unix timestamp number', () => invalid(1705312200, 'isDatetime'));
    it('null', () => invalid(null, 'isDatetime'));
    it('Date object', () => invalid(new Date(), 'isDatetime'));
    it('boolean', () => invalid(false, 'isDatetime'));
    it('object', () => invalid({}, 'isDatetime'));
  });
});

describe('isTime', () => {
  describe('valid time strings', () => {
    it('HH:MM:SS', () => valid('10:30:00', 'isTime'));
    it('HH:MM', () => valid('10:30', 'isTime'));
    it('midnight', () => valid('00:00:00', 'isTime'));
    it('end of day', () => valid('23:59:59', 'isTime'));
    it('with milliseconds', () => valid('10:30:00.500', 'isTime'));
  });

  describe('invalid time strings', () => {
    it('hour 24', () => invalid('24:00:00', 'isTime'));
    it('hour 25', () => invalid('25:00:00', 'isTime'));
    it('minute 60', () => invalid('10:60:00', 'isTime'));
    // chrono NaiveTime::parse_from_str allows second 60 (leap second)
    it('valid — second 60 accepted as leap second by chrono', () => valid('10:30:60', 'isTime'));
    it('empty string', () => invalid('', 'isTime'));
    it('plain text', () => invalid('noon', 'isTime'));
    it('date format', () => invalid('2024-01-15', 'isTime'));
  });

  describe('wrong value types', () => {
    it('number', () => invalid(1030, 'isTime'));
    it('null', () => invalid(null, 'isTime'));
    it('boolean', () => invalid(true, 'isTime'));
    it('object', () => invalid({ hour: 10 }, 'isTime'));
    it('array', () => invalid(['10:30:00'], 'isTime'));
  });
});
