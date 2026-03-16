import { describe, it } from '@jest/globals';
import { invalid, valid } from './helpers';

describe('isUrl', () => {
  describe('valid URLs', () => {
    it('http URL', () => valid('http://example.com', 'isUrl'));
    it('https URL', () => valid('https://example.com', 'isUrl'));
    it('https with path', () => valid('https://example.com/path/to/page', 'isUrl'));
    it('https with query params', () =>
      valid('https://example.com/search?q=hello&page=1', 'isUrl'));
    it('https with fragment', () => valid('https://example.com/page#section', 'isUrl'));
    it('ftp URL', () => valid('ftp://files.example.com', 'isUrl'));
    it('URL with port', () => valid('http://localhost:3000', 'isUrl'));
    it('URL with user info', () => valid('http://user:pass@example.com', 'isUrl'));
  });

  describe('invalid URLs', () => {
    it('missing scheme', () => invalid('example.com', 'isUrl'));
    it('just domain with www', () => invalid('www.example.com', 'isUrl'));
    it('plain text', () => invalid('not a url', 'isUrl'));
    it('empty string', () => invalid('', 'isUrl'));
    it('only slashes', () => invalid('//example.com', 'isUrl'));
  });

  describe('wrong value types', () => {
    it('number', () => invalid(123, 'isUrl'));
    it('null', () => invalid(null, 'isUrl'));
    it('object', () => invalid({ url: 'https://example.com' }, 'isUrl'));
    it('array', () => invalid(['https://example.com'], 'isUrl'));
    it('boolean', () => invalid(true, 'isUrl'));
    it('empty object', () => invalid({}, 'isUrl'));
  });
});

describe('isUrlWithScheme', () => {
  describe('valid', () => {
    it('https matches https scheme', () =>
      valid('https://example.com', ['isUrlWithScheme', 'https']));
    it('http matches http scheme', () => valid('http://example.com', ['isUrlWithScheme', 'http']));
    it('ftp matches ftp scheme', () => valid('ftp://example.com', ['isUrlWithScheme', 'ftp']));
  });

  describe('invalid — wrong scheme', () => {
    it('http fails when https required', () =>
      invalid('http://example.com', ['isUrlWithScheme', 'https']));
    it('https fails when http required', () =>
      invalid('https://example.com', ['isUrlWithScheme', 'http']));
    it('ftp fails when https required', () =>
      invalid('ftp://example.com', ['isUrlWithScheme', 'https']));
    it('no scheme fails', () => invalid('example.com', ['isUrlWithScheme', 'https']));
    it('empty string fails', () => invalid('', ['isUrlWithScheme', 'https']));
  });

  describe('wrong value types', () => {
    it('number', () => invalid(123, ['isUrlWithScheme', 'https']));
    it('null', () => invalid(null, ['isUrlWithScheme', 'https']));
    it('object', () => invalid({}, ['isUrlWithScheme', 'https']));
    it('boolean', () => invalid(true, ['isUrlWithScheme', 'https']));
  });
});
