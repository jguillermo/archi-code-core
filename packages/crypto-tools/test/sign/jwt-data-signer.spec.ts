import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { JWTDataSigner } from '../../src/sign/jwt-data-signer';

describe('JWTDataSigner', () => {
  const secretKey = 'supersecretkeysupersecretkey';
  const payload = {
    id: '39fb8463-8c29-4434-a5d6-07b964b36ad9',
    name: 'Alice',
    roles: ['user'],
  };

  let signer: JWTDataSigner;

  beforeEach(() => {
    signer = new JWTDataSigner(secretKey);
  });

  it('debería firmar los datos correctamente', () => {
    const signedToken = signer.sign(payload);
    expect(typeof signedToken).toEqual('string');
  });

  it('debería verificar y devolver los datos correctamente', () => {
    const signedToken = signer.sign(payload);
    const verifiedPayload = signer.verify(signedToken);
    expect(verifiedPayload['id']).toEqual(payload['id']);
  });

  it('verify Error: invalid signature', () => {
    const invalidToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjM5ZmI4NDYzLThjMjktNDQzNC1hNWQ2LTA3Yjk2NGIzNmFkOSIsInJvbGVzIjpbInVzZXIiXSwibmFtZSI6IkFsaWNlIiwiaWF0IjoxNzM2NTkwOTQ5fQ.sqVH29NXG3LaxwIDfaVg8HwcajjA7PbDW9AkOaEykb0';

    expect(() => signer.verify(invalidToken)).toThrow('verify Error: invalid signature');
  });

  it('verify Error: invalid signature', () => {
    const invalidToken = 'eyJhbGciOiJIUzI1NiIsIajjA7PbDW9AkOaEykb0';

    expect(() => signer.verify(invalidToken)).toThrow('verify Error: jwt malformed');
  });

  it('debería decodificar y devolver los datos correctamente', () => {
    const signedToken = signer.sign(payload);
    const decodedPayload = signer.data(signedToken);
    expect(decodedPayload['id']).toEqual(payload['id']);
  });

  it('read data data without secret', () => {
    const expiredToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjM5ZmI4NDYzLThjMjktNDQzNC1hNWQ2LTA3Yjk2NGIzNmFkOSIsInJvbGVzIjpbInVzZXIiXSwibmFtZSI6IkFsaWNlIiwiaWF0IjoxNzM2NTkwOTQ5fQ.sqVH29NXG3LaxwIDfaVg8HwcajjA7PbDW9AkOaEykb0';
    const result = signer.data(expiredToken);
    expect(result['id']).toEqual(payload['id']);
  });

  it('verify Error: invalid token', () => {
    const invalidToken = 'eyJhbGciOiJIUzI1ajjA7PbDW9AkOaEykb0';
    expect(signer.data(invalidToken)).toEqual({});
  });
});

describe('JWTDataSigner guards', () => {
  it('rejects a secret shorter than 16 characters', () => {
    expect(() => new JWTDataSigner('short')).toThrow(
      'La clave secreta debe ser una cadena de al menos 16 caracteres.',
    );
  });

  it('reports a data error when the token cannot be read', () => {
    const signer = new JWTDataSigner('supersecretkeysupersecretkey');
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => signer.data(circular as unknown as string)).toThrow(/^data Error: /);
  });

  it('refuses to work when jsonwebtoken is not installed', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await jest.isolateModulesAsync(async () => {
      jest.doMock('jsonwebtoken', () => {
        throw new Error('Cannot find module jsonwebtoken');
      });
      const isolated = await import('../../src/sign/jwt-data-signer');
      expect(() => new isolated.JWTDataSigner('supersecretkeysupersecretkey')).toThrow(
        'jsonwebtoken module is required but not installed.',
      );
    });
    jest.dontMock('jsonwebtoken');
    jest.restoreAllMocks();
  });
});
