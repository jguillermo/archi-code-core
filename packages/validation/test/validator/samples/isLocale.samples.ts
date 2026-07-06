import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isLocaleSample: ValidatorSample = {
  name: 'isLocale',
  run: (v) => validator.isLocale(v),
  valid: ['en-US', 'de-DE', 'fr-FR', 'es-ES'],
  invalid: ['123-US', '!!invalid', 'en--US', 'TOOLONGREALLYTOOLONGLOCALE'],
};
