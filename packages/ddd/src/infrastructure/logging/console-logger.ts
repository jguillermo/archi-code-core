import type { Clock, LogContext, Logger, LogLevel } from '../../application/index';
import { InternalErrorException } from '../exceptions/internal-error.exception';
import { SystemClock } from '../clock/system-clock';
import { LogSerializer } from './log-serializer';

export interface ConsoleLoggerOptions {
  readonly level?: LogLevel;
  readonly clock?: Clock;
}

export class ConsoleLogger implements Logger {
  private static readonly levels: readonly LogLevel[] = ['debug', 'info', 'warn', 'error'];

  private readonly output: Pick<Console, LogLevel> = console;
  private readonly minimum: number;
  private readonly clock: Clock;

  constructor({ level = 'info', clock = new SystemClock() }: ConsoleLoggerOptions = {}) {
    this.minimum = ConsoleLogger.levels.indexOf(level);
    if (this.minimum === -1) {
      throw new InternalErrorException(
        `unknown log level "${String(level)}": use ${ConsoleLogger.levels.join(', ')}`,
      );
    }
    this.clock = clock;
  }

  debug(message: string, context?: LogContext): void {
    this.write('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.write('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.write('warn', message, context);
  }

  error(message: string, context?: LogContext): void {
    this.write('error', message, context);
  }

  private write(level: LogLevel, message: string, context: LogContext | undefined): void {
    if (ConsoleLogger.levels.indexOf(level) < this.minimum) {
      return;
    }
    const entry = { time: this.clock.now().toISOString(), level, message };
    this.output[level](LogSerializer.line(entry, context));
  }
}
