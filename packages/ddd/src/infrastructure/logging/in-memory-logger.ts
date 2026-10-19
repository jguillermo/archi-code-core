import type { LogContext, Logger, LogLevel } from '../../application/index';

export interface LogEntry {
  readonly level: LogLevel;
  readonly message: string;
  readonly context?: LogContext;
}

export class InMemoryLogger implements Logger {
  private readonly recorded: LogEntry[] = [];

  get entries(): readonly LogEntry[] {
    return [...this.recorded];
  }

  debug(message: string, context?: LogContext): void {
    this.record('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.record('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.record('warn', message, context);
  }

  error(message: string, context?: LogContext): void {
    this.record('error', message, context);
  }

  private record(level: LogLevel, message: string, context: LogContext | undefined): void {
    this.recorded.push(context === undefined ? { level, message } : { level, message, context });
  }
}
