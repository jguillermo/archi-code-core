import { describe, expect, it } from '@jest/globals';
import { SearchPaginatorDto } from './search-paginator.dto';

describe('SearchPaginatorDto', () => {
  describe('Valid Cases', () => {
    it('should create a paginator with valid integer values', () => {
      const paginator = new SearchPaginatorDto(3, 25);
      expect(paginator.page).toBe(3);
      expect(paginator.perPage).toBe(25);
    });

    it('should accept numeric strings convertible to integers', () => {
      // Force the type with "as any" to simulate receiving a string.
      const paginator = new SearchPaginatorDto('5' as any, '10' as any);
      expect(paginator.page).toBe(5);
      expect(paginator.perPage).toBe(10);
    });
  });

  describe('Error Cases', () => {
    it('should throw an error when page is a float', () => {
      expect(() => new SearchPaginatorDto(3.5, 25)).toThrow('SearchPaginatorDto: "page" and "perPage" must be integers');
    });

    it('should throw an error when perPage is a float', () => {
      expect(() => new SearchPaginatorDto(3, 25.5)).toThrow('SearchPaginatorDto: "page" and "perPage" must be integers');
    });

    it('should throw an error when page is negative', () => {
      expect(() => new SearchPaginatorDto(-1, 25)).toThrow('SearchPaginatorDto: "page" and "perPage" must be positive integers');
    });

    it('should throw an error when perPage is negative', () => {
      expect(() => new SearchPaginatorDto(3, -10)).toThrow('SearchPaginatorDto: "page" and "perPage" must be positive integers');
    });

    it('should throw an error when page is zero', () => {
      expect(() => new SearchPaginatorDto(0, 10)).toThrow('SearchPaginatorDto: "page" and "perPage" must be positive integers');
    });

    it('should throw an error when perPage is zero', () => {
      expect(() => new SearchPaginatorDto(3, 0)).toThrow('SearchPaginatorDto: "page" and "perPage" must be positive integers');
    });

    it('should throw an error when page is not a number (NaN)', () => {
      expect(() => new SearchPaginatorDto(NaN, 10)).toThrow('SearchPaginatorDto: "page" and "perPage" must be integers');
    });

    it('should throw an error when perPage is not a number (NaN)', () => {
      expect(() => new SearchPaginatorDto(3, NaN)).toThrow('SearchPaginatorDto: "page" and "perPage" must be integers');
    });

    it('should throw an error when page is Infinity', () => {
      expect(() => new SearchPaginatorDto(Infinity, 10)).toThrow('SearchPaginatorDto: "page" and "perPage" must be integers');
    });

    it('should throw an error when perPage is Infinity', () => {
      expect(() => new SearchPaginatorDto(3, Infinity)).toThrow('SearchPaginatorDto: "page" and "perPage" must be integers');
    });
  });
});
