import { describe, expect, it } from '@jest/globals';
import { SearchGroupByDto } from './search-group-by.dto';

describe('SearchGroupByDto', () => {
  describe('Valid Cases', () => {
    it('should create a SearchGroupByDto from a string', () => {
      const groupBy = new SearchGroupByDto('department');
      expect(groupBy.fields).toEqual(['department']);
    });

    it('should create a SearchGroupByDto from an array of strings', () => {
      const groupBy = new SearchGroupByDto(['department', 'role']);
      expect(groupBy.fields).toEqual(['department', 'role']);
    });

    it('should create a SearchGroupByDto from an empty array', () => {
      const groupBy = new SearchGroupByDto([]);
      expect(groupBy.fields).toEqual([]);
    });
  });

  describe('Invalid Cases', () => {
    it('should throw an error if groupBy is null', () => {
      expect(() => new SearchGroupByDto(null as any)).toThrow('SearchGroupByDto: groupBy value cannot be null or undefined');
    });

    it('should throw an error if groupBy is undefined', () => {
      expect(() => new SearchGroupByDto(undefined as any)).toThrow('SearchGroupByDto: groupBy value cannot be null or undefined');
    });

    it('should throw an error if groupBy is an array with non-string elements', () => {
      expect(() => new SearchGroupByDto(['department', 123 as any])).toThrow('SearchGroupByDto: All groupBy fields must be strings');
    });

    it('should throw an error if groupBy is an object', () => {
      expect(() => new SearchGroupByDto({ key: 'department' } as any)).toThrow('SearchGroupByDto: groupBy must be a string or an array of strings');
    });

    it('should throw an error if groupBy is a number', () => {
      expect(() => new SearchGroupByDto(42 as any)).toThrow('SearchGroupByDto: groupBy must be a string or an array of strings');
    });

    it('should throw an error if groupBy is a boolean', () => {
      expect(() => new SearchGroupByDto(true as any)).toThrow('SearchGroupByDto: groupBy must be a string or an array of strings');
    });
  });
});
