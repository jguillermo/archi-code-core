import { describe } from '@jest/globals';
import {
  canByType,
  excludeItems,
  PrimitivesKeys,
  skipByType,
  testValidation,
} from '@code-core/test';
import { BooleanValidator } from './boolean.validator';

describe('BooleanValidator', () => {
  describe('canBeBoolean', () => {
    testValidation({
      validator: BooleanValidator.canBeBoolean,
      valid: canByType(PrimitivesKeys.BOOLEAN),
      invalid: [...excludeItems(skipByType(PrimitivesKeys.BOOLEAN), [1, 0]), {}],
    });
  });
});
