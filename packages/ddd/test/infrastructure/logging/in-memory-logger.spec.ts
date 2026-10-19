import { describe, expect, expectTypeOf, it } from 'vitest';
import type { Logger } from '../../../src/application/index';
import { InMemoryLogger } from '../../../src/infrastructure/logging/in-memory-logger';
import type { LogEntry } from '../../../src/infrastructure/logging/in-memory-logger';

describe('InMemoryLogger: the logger a test reads back', () => {
  it('can be injected wherever a Logger is asked for', () => {
    expectTypeOf<InMemoryLogger>().toMatchTypeOf<Logger>();
    expectTypeOf<InMemoryLogger['entries']>().toEqualTypeOf<readonly LogEntry[]>();
  });

  it('keeps every entry with its level, in the order it was written', () => {
    const logger = new InMemoryLogger();

    logger.debug('cart_loaded', { items: 2 });
    logger.info('order_placed', { orderId: 'ord-1001' });
    logger.warn('stock_low', { sku: 'TORCH-01' });
    logger.error('payment_failed');

    expect(logger.entries).toStrictEqual([
      { level: 'debug', message: 'cart_loaded', context: { items: 2 } },
      { level: 'info', message: 'order_placed', context: { orderId: 'ord-1001' } },
      { level: 'warn', message: 'stock_low', context: { sku: 'TORCH-01' } },
      { level: 'error', message: 'payment_failed' },
    ]);
  });

  it('returns a copy, so a test cannot change what was logged', () => {
    const logger = new InMemoryLogger();
    logger.info('order_placed');

    (logger.entries as LogEntry[]).length = 0;

    expect(logger.entries).toHaveLength(1);
  });
});
