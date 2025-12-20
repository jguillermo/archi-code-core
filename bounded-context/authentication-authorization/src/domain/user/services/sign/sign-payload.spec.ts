import { describe, expect, it } from '@jest/globals';
import { SignPayload } from './sign-payload';
import { UserId } from '../../types/userId';
import { UserRoles } from '../../types/userPermissions';
import { UserName } from '../../types/userName';
import { ValidationException } from '@code-core/domain';

describe('SignPayload', () => {
  it('debería crear una instancia válida con datos correctos', () => {
    const id = new UserId('25902bc8-c107-4204-a3b4-40fd33aedd44');
    const roles = new UserRoles(['admin']);
    const name = new UserName('John Doe');

    const payload = new SignPayload(id, roles, name);

    expect(payload).toBeInstanceOf(SignPayload);
    expect(payload.toJson()).toEqual({
      id: '25902bc8-c107-4204-a3b4-40fd33aedd44',
      roles: ['admin'],
      name: 'John Doe',
    });
  });

  it('debería lanzar ValidationException con datos inválidos', () => {
    const id = new UserId('25902bc8-c107-4204-a3b4-40fd33aedd44'); // ID inválido
    const roles = new UserRoles([]); // Roles inválidos
    const name = new UserName(''); // Nombre inválido

    expect(() => new SignPayload(id, roles, name)).toThrow(ValidationException);
  });

  it('debería crear una instancia a partir de datos sin procesar', () => {
    const data = { id: '25902bc8-c107-4204-a3b4-40fd33aedd44', roles: ['user'], name: 'Jane Doe' };
    const payload = SignPayload.create(data);

    expect(payload).toBeInstanceOf(SignPayload);
    expect(payload.toJson()).toEqual(data);
  });
});
