import { describe, expect, it } from '@jest/globals';
import { validate } from 'class-validator';
import { UserRegisterDto } from './user-register.dto';
import { Builder } from '@code-core/domain';

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

//
// [
//   {
//     "target": {
//       "levelValidation": 1,
//       "id": null,
//       "name": null,
//       "roles": null,
//       "details": null
//     },
//     "value": null,
//     "property": "id",
//     "children": [],
//     "constraints": {
//       "domainValidator": "must be a UUID, should not be empty"
//     }
//   },
//   {
//     "target": {
//       "levelValidation": 1,
//       "id": null,
//       "name": null,
//       "roles": null,
//       "details": null
//     },
//     "value": null,
//     "property": "roles",
//     "children": [],
//     "constraints": {
//       "domainValidator": "Value mas be to array"
//     }
//   }
// ]

describe('UserRegisterDto', () => {
  it('all correct data', async () => {
    const object = Builder(UserRegisterDto)
      .id('b674d469-4893-4e6b-849b-c1f9775f950b')
      .name('testUser')
      .roles(['admin'])
      .details({
        username_password: {
          password: '123456',
          userName: 'admin',
        },
      })
      .build();
    const errors = await validate(object);
    expect(errors.length).toEqual(0);
  });

  it('send password error', async () => {
    const object = Builder(UserRegisterDto)
      .id('b674d469-4893-4e6b-849b-c1f9775f950b')
      .name('testUser')
      .roles(['admin'])
      .details({
        username_password: {
          userName: 'admin',
        },
      } as any)
      .build();
    const errors = await validate(object);
    expect(errors.length).toEqual(1);
    expect(getConstrainsByKey('details', errors)).toEqual({
      domainValidator: "JsonSchemaValidator:/username_password must have required property 'password'",
    });
  });

  it('send password error', async () => {
    const object = Builder(UserRegisterDto)
      .id('b674d469-4893-4e6b-849b-c1f9775f950b')
      .name('testUser')
      .roles(['admin'])
      .details({
        username_password: {
          password: '123456',
        },
      } as any)
      .build();
    const errors = await validate(object);
    expect(errors.length).toEqual(1);
    expect(getConstrainsByKey('details', errors)).toEqual({
      domainValidator: "JsonSchemaValidator:/username_password must have required property 'userName'",
    });
  });

  it('send empty data', async () => {
    const object = Builder(UserRegisterDto).build();
    const errors = await validate(object);
    expect(errors.length).toEqual(2);

    expect(getConstrainsByKey('id', errors)).toEqual({
      domainValidator: 'must be a UUID, should not be empty',
    });
    expect(getConstrainsByKey('roles', errors)).toEqual({
      domainValidator: 'Value mas be to array',
    });
  });
});
