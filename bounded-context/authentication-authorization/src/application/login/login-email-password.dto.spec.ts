import { describe, expect, it } from '@jest/globals';
import { validate } from 'class-validator';
import { Builder } from '@code-core/domain';
import { LoginEmailPasswordDto } from './login-email-password.dto';

interface ValidationError {
  target?: object;
  property: string;
  value?: any;
  constraints?: {
    [type: string]: string;
  };
}

function getConstrainsByKey(key: string, erros: ValidationError[]) {
  return erros.find((error) => error.property === key)?.constraints;
}

describe('LoginEmailPasswordDto', () => {
  it('all correct data', async () => {
    const object = Builder(LoginEmailPasswordDto).email('123456@mail.com').password('admin').build();
    const errors = await validate(object);
    expect(errors.length).toEqual(0);
  });

  it('send password  empty error', async () => {
    const object = Builder(LoginEmailPasswordDto).email('123456@mail.com').build();
    const errors = await validate(object);
    expect(errors.length).toEqual(1);
    expect(getConstrainsByKey('password', errors)).toEqual({
      domainValidator: 'must be a string, should not be empty, must be longer than or equal to 3 characters',
    });
  });

  it('send email empty error', async () => {
    const object = Builder(LoginEmailPasswordDto).password('admin').build();
    const errors = await validate(object);
    expect(errors.length).toEqual(1);
    expect(getConstrainsByKey('email', errors)).toEqual({
      domainValidator: 'must be a string, should not be empty, must be an email',
    });
  });

  it('send empty data', async () => {
    const object = Builder(LoginEmailPasswordDto).build();
    const errors = await validate(object);
    expect(errors.length).toEqual(2);

    expect(getConstrainsByKey('email', errors)).toEqual({
      domainValidator: 'must be a string, should not be empty, must be an email',
    });
    expect(getConstrainsByKey('password', errors)).toEqual({
      domainValidator: 'must be a string, should not be empty, must be longer than or equal to 3 characters',
    });
  });
});
