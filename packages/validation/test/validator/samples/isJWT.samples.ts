import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isJWTSample: ValidatorSample = {
  name: 'isJWT',
  run: (v) => validator.isJWT(v),
  valid: [
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
    'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIn0.c2lnbmF0dXJl',
    'eyJhbGciOiJIUzM4NCIsInR5cCI6IkpXVCJ9.eyJmb28iOiJiYXIifQ.abc123XYZ',
    'aGVhZGVy.cGF5bG9hZA.c2lnbmF0dXJl',
  ],
  invalid: ['not-a-jwt', 'only-one-part', 'two.parts', 'has!chars.in.here'],
};
