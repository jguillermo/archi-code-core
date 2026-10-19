import { describe, expect, expectTypeOf, it } from 'vitest';
import type { LogContext, Logger, LogLevel } from '../../../src/application/ports/logger';

class ShipOrder {
  constructor(private readonly logger: Logger) {}

  execute(orderId: string, carrier: string): void {
    this.logger.info('order_shipped', { orderId, carrier });
  }
}

describe('Logger: the port any logging library can implement', () => {
  it('has one method per level, each taking a message and an optional context', () => {
    expectTypeOf<LogLevel>().toEqualTypeOf<'debug' | 'info' | 'warn' | 'error'>();
    expectTypeOf<LogContext>().toEqualTypeOf<Readonly<Record<string, unknown>>>();
    expectTypeOf<Logger[LogLevel]>().toEqualTypeOf<
      (message: string, context?: LogContext) => void
    >();
  });

  it('is satisfied by console and by loggers with the same shape, without an adapter', () => {
    expectTypeOf<Console>().toMatchTypeOf<Logger>();
  });

  it('lets a use case write a structured entry through any provider', () => {
    const written: [LogLevel, string, LogContext | undefined][] = [];
    const provider: Logger = {
      debug: (message, context) => written.push(['debug', message, context]),
      info: (message, context) => written.push(['info', message, context]),
      warn: (message, context) => written.push(['warn', message, context]),
      error: (message, context) => written.push(['error', message, context]),
    };

    new ShipOrder(provider).execute('ord-1001', 'SEUR');

    expect(written).toStrictEqual([
      ['info', 'order_shipped', { orderId: 'ord-1001', carrier: 'SEUR' }],
    ]);
  });
});
