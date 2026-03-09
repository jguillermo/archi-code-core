import { describe, expect, it } from '@jest/globals';
import { validate } from '../validators/validate';

describe('real-world form validation', () => {
  describe('user registration', () => {
    it('all valid data', () => {
      const r = validate({
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
      expect(Object.values(r.errors).every((e) => e.length === 0)).toBe(true);
    });

    it('all invalid data', () => {
      const r = validate({
        fields: [
          { field: 'email', value: 'not-email', validations: ['isEmail'] },
          {
            field: 'username',
            value: 'u!',
            validations: ['isAlphanumeric', ['isLengthBetween', 3, 20]],
          },
          { field: 'age', value: 15, validations: [['isInRange', 18, 99]] },
          { field: 'website', value: 'no-scheme', validations: ['isUrl'] },
        ],
      });
      expect(r.ok).toBe(false);
      expect(r.errors.email.length).toBeGreaterThan(0);
      expect(r.errors.username.length).toBeGreaterThan(0);
      expect(r.errors.age.length).toBeGreaterThan(0);
      expect(r.errors.website.length).toBeGreaterThan(0);
    });

    it('partial errors — email ok, username fails', () => {
      const r = validate({
        fields: [
          { field: 'email', value: 'user@example.com', validations: ['isEmail'] },
          { field: 'username', value: 'u!', validations: ['isAlphanumeric', ['isMinLength', 3]] },
        ],
      });
      expect(r.ok).toBe(false);
      expect(r.errors.email).toEqual([]);
      expect(r.errors.username.length).toBeGreaterThan(0);
    });
  });

  describe('API endpoint validation', () => {
    it('UUID param + pagination', () => {
      const r = validate({
        fields: [
          { field: 'id', value: '550e8400-e29b-41d4-a716-446655440000', validations: ['isUuid'] },
          { field: 'page', value: 1, validations: ['isPositiveInteger'] },
          { field: 'limit', value: 20, validations: ['isPositiveInteger', ['isMaxValue', 100]] },
        ],
      });
      expect(r.ok).toBe(true);
    });

    it('invalid UUID and page out of range', () => {
      const r = validate({
        fields: [
          { field: 'id', value: 'bad-uuid', validations: ['isUuid'] },
          { field: 'page', value: 0, validations: ['isPositiveInteger'] },
          { field: 'limit', value: 200, validations: ['isPositiveInteger', ['isMaxValue', 100]] },
        ],
      });
      expect(r.ok).toBe(false);
      expect(r.errors.id.length).toBeGreaterThan(0);
      expect(r.errors.page.length).toBeGreaterThan(0);
      expect(r.errors.limit.length).toBeGreaterThan(0);
    });
  });

  describe('Spanish locale form', () => {
    it('returns Spanish error messages for all failing fields', () => {
      const r = validate({
        locale: 'es',
        fields: [
          { field: 'email', value: 'bad', validations: ['isEmail'] },
          { field: 'edad', value: 200, validations: [['isInRange', 0, 120]] },
          { field: 'nombre', value: '', validations: ['isNotEmpty'] },
        ],
      });
      expect(r.errors.email[0]).toContain('correo');
      expect(r.errors.edad[0]).toContain('entre');
      expect(r.errors.nombre[0]).toContain('vacío');
    });
  });

  describe('custom messages per field', () => {
    it('each field uses its own custom message', () => {
      const r = validate({
        fields: [
          {
            field: 'email',
            value: 'bad',
            validations: [{ rule: 'isEmail', message: 'El email no es válido' }],
          },
          {
            field: 'name',
            value: '',
            validations: [{ rule: 'isNotEmpty', message: 'El nombre es requerido' }],
          },
        ],
      });
      expect(r.errors.email).toEqual(['El email no es válido']);
      expect(r.errors.name).toEqual(['El nombre es requerido']);
    });
  });

  describe('network/infra validation', () => {
    it('valid server config', () => {
      const r = validate({
        fields: [
          { field: 'host', value: '192.168.1.100', validations: ['isIpv4'] },
          {
            field: 'port',
            value: 8080,
            validations: ['isPositiveInteger', ['isInRange', 1, 65535]],
          },
          {
            field: 'callback',
            value: 'https://webhook.example.com/cb',
            validations: ['isUrl', ['isUrlWithScheme', 'https']],
          },
        ],
      });
      expect(r.ok).toBe(true);
    });

    it('invalid server config', () => {
      const r = validate({
        fields: [
          { field: 'host', value: '999.999.999.999', validations: ['isIpv4'] },
          {
            field: 'port',
            value: 99999,
            validations: ['isPositiveInteger', ['isInRange', 1, 65535]],
          },
          {
            field: 'callback',
            value: 'http://insecure.com',
            validations: ['isUrl', ['isUrlWithScheme', 'https']],
          },
        ],
      });
      expect(r.ok).toBe(false);
      expect(r.errors.host.length).toBeGreaterThan(0);
      expect(r.errors.port.length).toBeGreaterThan(0);
      expect(r.errors.callback.length).toBeGreaterThan(0);
    });
  });
});
