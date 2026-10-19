import type { LogContext } from '../../application/index';

export class LogSerializer {
  static line(entry: Readonly<Record<string, string>>, context: LogContext | undefined): string {
    if (context === undefined) {
      return JSON.stringify(entry);
    }
    try {
      return JSON.stringify({ ...entry, context: LogSerializer.plain(context, new Set()) });
    } catch {
      return JSON.stringify({ ...entry, context: '[Unserializable]' });
    }
  }

  private static plain(value: unknown, ancestors: Set<object>): unknown {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    if (typeof value !== 'object' || value === null) {
      return value;
    }
    if (ancestors.has(value)) {
      return '[Circular]';
    }
    ancestors.add(value);
    try {
      return LogSerializer.plainObject(value, ancestors);
    } finally {
      ancestors.delete(value);
    }
  }

  private static plainObject(value: object, ancestors: Set<object>): unknown {
    if (value instanceof Error) {
      return LogSerializer.plainError(value, ancestors);
    }
    if (Array.isArray(value)) {
      return value.map((item) => LogSerializer.plain(item, ancestors));
    }
    const { toJSON } = value as { toJSON?: unknown };
    if (typeof toJSON === 'function') {
      return LogSerializer.plain(toJSON.call(value), ancestors);
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, LogSerializer.plain(item, ancestors)]),
    );
  }

  private static plainError(error: Error, ancestors: Set<object>): Record<string, unknown> {
    const { code, errors, cause } = error as Error & {
      code?: unknown;
      errors?: unknown;
      cause?: unknown;
    };
    return {
      name: error.name,
      message: error.message,
      ...(typeof code === 'string' ? { code } : {}),
      ...(Array.isArray(errors) ? { errors: LogSerializer.plain(errors, ancestors) } : {}),
      ...(error.stack === undefined ? {} : { stack: error.stack }),
      ...(cause === undefined ? {} : { cause: LogSerializer.plain(cause, ancestors) }),
    };
  }
}
