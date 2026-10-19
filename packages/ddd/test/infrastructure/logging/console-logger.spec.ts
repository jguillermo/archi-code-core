import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import type { Logger, LogLevel } from '../../../src/application/index';
import { InternalErrorException } from '../../../src/exceptions/index';
import { FixedClock } from '../../../src/infrastructure/clock/fixed-clock';
import { ConsoleLogger } from '../../../src/infrastructure/logging/console-logger';

const LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error'];

describe('ConsoleLogger: one JSON line per entry on the console', () => {
  let output: Record<LogLevel, MockInstance>;
  const clock = new FixedClock('2026-10-19T09:30:00Z');

  beforeEach(() => {
    output = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => undefined),
      info: vi.spyOn(console, 'info').mockImplementation(() => undefined),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => undefined),
      error: vi.spyOn(console, 'error').mockImplementation(() => undefined),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  const lines = (level: LogLevel): unknown[] =>
    output[level].mock.calls.map(([line]) => JSON.parse(line as string));

  it('can be injected wherever a Logger is asked for', () => {
    expectTypeOf<ConsoleLogger>().toMatchTypeOf<Logger>();
  });

  it('writes the time, the level, the message and the context through the console method of its level', () => {
    const logger = new ConsoleLogger({ level: 'debug', clock });

    LEVELS.forEach((level) => logger[level]('order_placed', { orderId: 'ord-1001' }));

    for (const level of LEVELS) {
      expect(output[level]).toHaveBeenCalledTimes(1);
      expect(lines(level)).toStrictEqual([
        {
          time: '2026-10-19T09:30:00.000Z',
          level,
          message: 'order_placed',
          context: { orderId: 'ord-1001' },
        },
      ]);
    }
  });

  it('writes no context key when the entry has none', () => {
    new ConsoleLogger({ clock }).info('server_started');

    expect(output.info).toHaveBeenCalledWith(
      '{"time":"2026-10-19T09:30:00.000Z","level":"info","message":"server_started"}',
    );
  });

  it('writes from info up by default, so debug stays out of production', () => {
    const logger = new ConsoleLogger({ clock });

    logger.debug('cart_loaded');
    logger.info('order_placed');

    expect(output.debug).not.toHaveBeenCalled();
    expect(output.info).toHaveBeenCalledTimes(1);
  });

  it('drops every entry below the minimum level', () => {
    const logger = new ConsoleLogger({ level: 'warn', clock });

    LEVELS.forEach((level) => logger[level]('payment_retried'));

    expect(LEVELS.filter((level) => output[level].mock.calls.length > 0)).toStrictEqual([
      'warn',
      'error',
    ]);
  });

  it('takes the time from the system clock when none is given', () => {
    vi.useFakeTimers({ now: new Date('2026-03-01T08:00:00Z') });

    new ConsoleLogger().error('payment_failed');

    expect(lines('error')).toMatchObject([{ time: '2026-03-01T08:00:00.000Z' }]);
  });

  it('writes an error with its name, code, message, stack and cause, which JSON.stringify would lose', () => {
    const cause = new Error('connection refused');
    const failure = new InternalErrorException('database unavailable', { cause });

    new ConsoleLogger({ clock }).error('http_request_failed', { error: failure });

    const [line] = lines('error') as { context: { error: Record<string, unknown> } }[];
    expect(line.context.error).toMatchObject({
      name: 'InternalErrorException',
      code: 'INF001',
      message: failure.message,
      stack: expect.stringContaining('InternalErrorException'),
      cause: { name: 'Error', message: 'connection refused' },
    });
  });

  it('refuses a level it does not know, as a wiring mistake', () => {
    expect(() => new ConsoleLogger({ level: 'warning' as LogLevel })).toThrow(
      new InternalErrorException('unknown log level "warning": use debug, info, warn, error'),
    );
  });
});
