import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isLowercaseSample: ValidatorSample = {
  name: 'isLowercase',
  run: (v) => validator.isLowercase(v),
  valid: ['abc def', 'hello world', 'test string', 'lowercase only'],
  invalid: ['UPPERCASE', 'Mixed Case', 'HAS CAPS', 'NotLower'],
};
