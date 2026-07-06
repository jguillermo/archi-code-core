import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isMongoIdSample: ValidatorSample = {
  name: 'isMongoId',
  run: (v) => validator.isMongoId(v),
  valid: [
    '507f1f77bcf86cd799439011',
    '5e63c3a5e4232e4cd0274ac2',
    '6329e9e5f41f2b9ad0a3e821',
    '507f191e810c19729de860ea',
  ],
  invalid: ['not-mongo-id', '507f1f77bcf86cd7994390', 'ZZZZZZZZZZZZZZZZZZZZZZZZ', '123'],
};
