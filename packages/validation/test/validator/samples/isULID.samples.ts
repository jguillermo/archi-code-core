import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isULIDSample: ValidatorSample = {
  name: 'isULID',
  run: (v) => validator.isULID(v),
  valid: [
    '01ARZ3NDEKTSV4RRFFQ69G5FAV',
    '01BX5ZZKBKACTAV9WEVGEMMVS0',
    '01F8MECHZX3TBDSZ7XRADM79XE',
    '01HHNA26QJMHSZ54BFZABC1234',
  ],
  invalid: ['not-ulid', '01ARZ3NDEKTSV4RRFFQ69G5FA', 'INVALID!!!!', 'ZZZZZZZZZZZZZZZZZZZZZZZZZZ'],
};
