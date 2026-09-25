export { default as validator } from './validators';
export * from './canBe';
export * from './convert';
export * as sanitizer from './sanitizer';
export { createValidator } from './createValidator';
export { scorePassword } from './validators/isStrongPassword';
export { ValidationConfigError } from './validators/util/errors';
// Every validator option / parameter type (IsEmailOptions, MobilePhoneLocale, …) and ValidatorRegistry.
export type * from './validators';
export type { NormalizeEmailOptions } from './sanitizer/normalizeEmail';
