/**
 * Thrown by a validator when its CONFIGURATION is invalid (unknown locale / country code /
 * provider, impossible option). Validators never throw because of the VALUE being validated —
 * an unacceptable value always yields `false`.
 */
export class ValidationConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationConfigError';
  }
}
