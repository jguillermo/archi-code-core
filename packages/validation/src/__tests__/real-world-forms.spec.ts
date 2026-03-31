import { describe, expect, it } from '@jest/globals';
import { createValidator } from '../validators/validate';

describe('real-world form validation', () => {
  describe('user registration', () => {
    const userValidator = createValidator([
      { field: 'email', validations: ['isEmail'] },
      { field: 'username', validations: ['isAlphanumeric', ['isLengthBetween', 3, 20]] },
      { field: 'age', validations: [['isInRange', 18, 99]] },
      { field: 'website', validations: ['isUrl'] },
    ]);

    it('all valid data', () => {
      const r = userValidator.validate({
        email: 'user@example.com',
        username: 'user123',
        age: 25,
        website: 'https://mysite.com',
      });
      expect(r.ok).toBe(true);
      expect(Object.values(r.errors).every((e) => e.length === 0)).toBe(true);
    });

    it('all invalid data', () => {
      const r = userValidator.validate({
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
      const v = createValidator([
        { field: 'email', validations: ['isEmail'] },
        { field: 'username', validations: ['isAlphanumeric', ['isMinLength', 3]] },
      ]);
      const r = v.validate({ email: 'user@example.com', username: 'u!' });
      expect(r.ok).toBe(false);
      expect(r.errors.email).toEqual([]);
      expect(r.errors.username.length).toBeGreaterThan(0);
    });
  });

  describe('API endpoint validation', () => {
    const apiValidator = createValidator([
      { field: 'id', validations: ['isUuid'] },
      { field: 'page', validations: ['isPositiveInteger'] },
      { field: 'limit', validations: ['isPositiveInteger', ['isMaxValue', 100]] },
    ]);

    it('UUID param + pagination', () => {
      const r = apiValidator.validate({
        id: '550e8400-e29b-41d4-a716-446655440000',
        page: 1,
        limit: 20,
      });
      expect(r.ok).toBe(true);
    });

    it('invalid UUID and page out of range', () => {
      const r = apiValidator.validate({ id: 'bad-uuid', page: 0, limit: 200 });
      expect(r.ok).toBe(false);
      expect(r.errors.id.length).toBeGreaterThan(0);
      expect(r.errors.page.length).toBeGreaterThan(0);
      expect(r.errors.limit.length).toBeGreaterThan(0);
    });
  });

  describe('failing fields return rule codes', () => {
    it('returns codes for all failing fields', () => {
      const v = createValidator([
        { field: 'email', validations: ['isEmail'] },
        { field: 'edad', validations: [['isInRange', 0, 120]] },
        { field: 'nombre', validations: ['isNotEmpty'] },
      ]);
      const r = v.validate({ email: 'bad', edad: 200, nombre: '' });
      expect(r.errors.email).toEqual([25]); // isEmail
      expect(r.errors.edad).toEqual([21]); // isInRange
      expect(r.errors.nombre).toEqual([0]); // isNotEmpty
    });
  });

  describe('custom messages per field', () => {
    it('custom messages are ignored — rule codes returned', () => {
      const v = createValidator([
        { field: 'email', validations: [{ rule: 'isEmail', message: 'El email no es válido' }] },
        { field: 'name', validations: [{ rule: 'isNotEmpty', message: 'El nombre es requerido' }] },
      ]);
      const r = v.validate({ email: 'bad', name: '' });
      expect(r.errors.email).toEqual([25]); // isEmail
      expect(r.errors.name).toEqual([0]); // isNotEmpty
    });
  });

  describe('network/infra validation', () => {
    const serverValidator = createValidator([
      { field: 'host', validations: ['isIpv4'] },
      { field: 'port', validations: ['isPositiveInteger', ['isInRange', 1, 65535]] },
      { field: 'callback', validations: ['isUrl', ['isUrlWithScheme', 'https']] },
    ]);

    it('valid server config', () => {
      const r = serverValidator.validate({
        host: '192.168.1.100',
        port: 8080,
        callback: 'https://webhook.example.com/cb',
      });
      expect(r.ok).toBe(true);
    });

    it('invalid server config', () => {
      const r = serverValidator.validate({
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
