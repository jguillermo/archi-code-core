import { describe, expect, it } from '@jest/globals';
import { validate } from '../validators/validate';

const userSchema = [
  { field: 'email', validations: ['isEmail'] },
  { field: 'username', validations: ['isAlphanumeric', ['isLengthBetween', 3, 20]] },
  { field: 'age', validations: [['isInRange', 18, 99]] },
  { field: 'website', validations: ['isUrl'] },
] as const;

const apiSchema = [
  { field: 'id', validations: ['isUuid'] },
  { field: 'page', validations: ['isPositiveInteger'] },
  { field: 'limit', validations: ['isPositiveInteger', ['isMaxValue', 100]] },
] as const;

const serverSchema = [
  { field: 'host', validations: ['isIpv4'] },
  { field: 'port', validations: ['isPositiveInteger', ['isInRange', 1, 65535]] },
  { field: 'callback', validations: ['isUrl', ['isUrlWithScheme', 'https']] },
] as const;

describe('real-world form validation', () => {
  describe('user registration', () => {
    it('all valid data', () => {
      const r = validate(userSchema as any, {
        email: 'user@example.com',
        username: 'user123',
        age: 25,
        website: 'https://mysite.com',
      });
      expect(r.ok).toBe(true);
      expect(Object.values(r.errors).every((e) => e.length === 0)).toBe(true);
    });

    it('all invalid data', () => {
      const r = validate(userSchema as any, {
        email: 'not-email',
        username: 'u!',
        age: 15,
        website: 'no-scheme',
      });
      expect(r.ok).toBe(false);
      expect(r.errors.email.length).toBeGreaterThan(0);
      expect(r.errors.username.length).toBeGreaterThan(0);
      expect(r.errors.age.length).toBeGreaterThan(0);
      expect(r.errors.website.length).toBeGreaterThan(0);
    });

    it('partial errors — email ok, username fails', () => {
      const r = validate(
        [
          { field: 'email', validations: ['isEmail'] },
          { field: 'username', validations: ['isAlphanumeric', ['isMinLength', 3]] },
        ],
        { email: 'user@example.com', username: 'u!' },
      );
      expect(r.ok).toBe(false);
      expect(r.errors.email).toEqual([]);
      expect(r.errors.username.length).toBeGreaterThan(0);
    });
  });

  describe('API endpoint validation', () => {
    it('UUID param + pagination', () => {
      const r = validate(apiSchema as any, {
        id: '550e8400-e29b-41d4-a716-446655440000',
        page: 1,
        limit: 20,
      });
      expect(r.ok).toBe(true);
    });

    it('invalid UUID and page out of range', () => {
      const r = validate(apiSchema as any, { id: 'bad-uuid', page: 0, limit: 200 });
      expect(r.ok).toBe(false);
      expect(r.errors.id.length).toBeGreaterThan(0);
      expect(r.errors.page.length).toBeGreaterThan(0);
      expect(r.errors.limit.length).toBeGreaterThan(0);
    });
  });

  describe('failing fields return rule codes', () => {
    it('returns codes for all failing fields', () => {
      const r = validate(
        [
          { field: 'email', validations: ['isEmail'] },
          { field: 'edad', validations: [['isInRange', 0, 120]] },
          { field: 'nombre', validations: ['isNotEmpty'] },
        ],
        { email: 'bad', edad: 200, nombre: '' },
      );
      expect(r.errors.email).toEqual([25]); // isEmail
      expect(r.errors.edad).toEqual([21]); // isInRange
      expect(r.errors.nombre).toEqual([0]); // isNotEmpty
    });
  });

  describe('custom messages per field', () => {
    it('custom messages are ignored — rule codes returned', () => {
      const r = validate(
        [
          { field: 'email', validations: [{ rule: 'isEmail', message: 'El email no es válido' }] },
          {
            field: 'name',
            validations: [{ rule: 'isNotEmpty', message: 'El nombre es requerido' }],
          },
        ],
        { email: 'bad', name: '' },
      );
      expect(r.errors.email).toEqual([25]); // isEmail
      expect(r.errors.name).toEqual([0]); // isNotEmpty
    });
  });

  describe('network/infra validation', () => {
    it('valid server config', () => {
      const r = validate(serverSchema as any, {
        host: '192.168.1.100',
        port: 8080,
        callback: 'https://webhook.example.com/cb',
      });
      expect(r.ok).toBe(true);
    });

    it('invalid server config', () => {
      const r = validate(serverSchema as any, {
        host: '999.999.999.999',
        port: 99999,
        callback: 'http://insecure.com',
      });
      expect(r.ok).toBe(false);
      expect(r.errors.host.length).toBeGreaterThan(0);
      expect(r.errors.port.length).toBeGreaterThan(0);
      expect(r.errors.callback.length).toBeGreaterThan(0);
    });
  });
});
