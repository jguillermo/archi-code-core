import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isUUIDSample: ValidatorSample = {
  name: 'isUUID',
  run: (v) => validator.isUUID(v, undefined),
  valid: [
    '9034e0f8-9b9a-4b3a-8c3a-2f1d6f3a1b2c',
    '110e8400-e29b-41d4-a716-446655440000',
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    '550e8400-e29b-41d4-a716-446655440001',
  ],
  invalid: ['not-a-uuid', 'GGGGGGGG-GGGG-GGGG-GGGG-GGGGGGGGGGGG', 'tooshort', 'invalid'],
};
