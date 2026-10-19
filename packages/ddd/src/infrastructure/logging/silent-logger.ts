import type { Logger } from '../../application/index';

export class SilentLogger implements Logger {
  debug(): void {
    return undefined;
  }

  info(): void {
    return undefined;
  }

  warn(): void {
    return undefined;
  }

  error(): void {
    return undefined;
  }
}
