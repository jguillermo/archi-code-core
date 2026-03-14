import { describe, expect, it } from '@jest/globals';
import { validateJson } from '../validators/validate-json';

describe('validateJson', () => {
  describe('accepts object input', () => {
    it('all valid', () => {
      const r = validateJson({
        fields: [
          { field: 'email', value: 'user@example.com', validations: ['isEmail'] },
          { field: 'name', value: 'Alice', validations: ['isNotEmpty', ['isMinLength', 2]] },
          { field: 'age', value: 25, validations: [['isInRange', 18, 99]] },
        ],
      });
      expect(r.ok).toBe(true);
      expect(r.errors.email).toEqual([]);
      expect(r.errors.name).toEqual([]);
      expect(r.errors.age).toEqual([]);
    });

    it('all failing', () => {
      const r = validateJson({
        fields: [
          { field: 'email', value: 'bad', validations: ['isEmail'] },
          { field: 'name', value: '', validations: ['isNotEmpty'] },
          { field: 'age', value: 5, validations: [['isInRange', 18, 99]] },
        ],
      });
      expect(r.ok).toBe(false);
      expect(r.errors.email.length).toBeGreaterThan(0);
      expect(r.errors.name.length).toBeGreaterThan(0);
      expect(r.errors.age.length).toBeGreaterThan(0);
    });
  });

  describe('accepts raw JSON string input', () => {
    it('valid JSON string', () => {
      const json = JSON.stringify({
        fields: [{ field: 'slug', value: 'hello-world', validations: ['isSlug'] }],
      });
      const r = validateJson(json);
      expect(r.ok).toBe(true);
      expect(r.errors.slug).toEqual([]);
    });

    it('invalid JSON string returns parse error', () => {
      const r = validateJson('not-json');
      expect(r.ok).toBe(false);
      expect(r.errors._parse).toBeDefined();
    });
  });

  describe('all three rule formats', () => {
    it('simple string rule', () => {
      const r = validateJson({
        fields: [{ field: 'e', value: 'user@example.com', validations: ['isEmail'] }],
      });
      expect(r.ok).toBe(true);
    });

    it('array rule with params', () => {
      const r = validateJson({
        fields: [{ field: 'n', value: 'hi', validations: [['isMinLength', 5]] }],
      });
      expect(r.ok).toBe(false);
    });

    it('object rule with custom message', () => {
      const r = validateJson({
        fields: [
          {
            field: 'email',
            value: 'bad',
            validations: [{ rule: 'isEmail', message: 'Custom email error' }],
          },
        ],
      });
      expect(r.ok).toBe(false);
      expect(r.errors.email).toEqual(['Custom email error']);
    });
  });

  describe('locale support', () => {
    it('spanish messages', () => {
      const r = validateJson({
        locale: 'es',
        fields: [{ field: 'email', value: 'bad', validations: ['isEmail'] }],
      });
      expect(r.ok).toBe(false);
      expect(r.errors.email[0]).toContain('correo');
    });

    it('defaults to english', () => {
      const r = validateJson({
        fields: [{ field: 'email', value: 'bad', validations: ['isEmail'] }],
      });
      expect(r.ok).toBe(false);
      expect(r.errors.email[0]).toContain('email');
    });
  });

  describe('value types', () => {
    it('string value', () => {
      const r = validateJson({
        fields: [{ field: 'f', value: 'hello', validations: ['isNotEmpty'] }],
      });
      expect(r.ok).toBe(true);
    });

    it('number value', () => {
      const r = validateJson({
        fields: [{ field: 'f', value: 42, validations: ['isPositiveInteger'] }],
      });
      expect(r.ok).toBe(true);
    });

    it('boolean value', () => {
      const r = validateJson({
        fields: [{ field: 'f', value: true, validations: ['isBooleanString'] }],
      });
      expect(r.ok).toBe(true);
    });

    it('null value fails isNotEmpty', () => {
      const r = validateJson({
        fields: [{ field: 'f', value: null, validations: ['isNotEmpty'] }],
      });
      expect(r.ok).toBe(false);
    });
  });

  describe('output matches validate() shape', () => {
    it('ok field present', () => {
      const r = validateJson({ fields: [] });
      expect(typeof r.ok).toBe('boolean');
    });

    it('errors field is a record', () => {
      const r = validateJson({ fields: [{ field: 'x', value: 'y', validations: ['isEmail'] }] });
      expect(typeof r.errors).toBe('object');
      expect(Array.isArray(r.errors.x)).toBe(true);
    });
  });

  describe('real-world form — same results as validate()', () => {
    it('user registration batch', () => {
      const r = validateJson({
        locale: 'en',
        fields: [
          { field: 'email', value: 'user@example.com', validations: ['isEmail'] },
          {
            field: 'username',
            value: 'user123',
            validations: ['isAlphanumeric', ['isLengthBetween', 3, 20]],
          },
          { field: 'age', value: 25, validations: [['isInRange', 18, 99]] },
          { field: 'website', value: 'https://mysite.com', validations: ['isUrl'] },
        ],
      });
      expect(r.ok).toBe(true);
    });
  });
});
