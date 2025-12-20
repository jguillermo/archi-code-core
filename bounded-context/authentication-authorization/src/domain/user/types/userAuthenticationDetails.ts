import { AbstractJsonType, AddValidate, JsonSchemaValidator } from '@code-core/domain';

export interface AuthenticationDetails {
  username_password?: { password: string; userName: string } | undefined;
  [key: string]: object | undefined;
}

const jsonSchema = {
  type: 'object',
  properties: {
    username_password: {
      type: 'object',
      properties: {
        userName: { type: 'string', minLength: 5 },
        password: { type: 'string', minLength: 6 },
      },
      required: ['userName', 'password'],
    },
  },
  if: {
    properties: {
      username_password: { type: 'object' },
    },
  },
  then: {
    required: ['username_password'],
  },
  additionalProperties: false,
};

@AddValidate([{ validator: 'IsOptional' }])
@AddValidate([{ validator: JsonSchemaValidator, value: jsonSchema }])
export class UserAuthenticationDetails extends AbstractJsonType<AuthenticationDetails, null> {
  constructor(value: AuthenticationDetails | null = null) {
    super(value);
  }

  get password(): string | null {
    return this.value?.username_password?.password ?? null;
  }
}
