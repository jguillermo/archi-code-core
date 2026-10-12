export class ValidationConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationConfigError';
  }
}
