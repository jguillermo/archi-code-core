import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import type { Logger } from '../../../src/application/index';
import { SilentLogger } from '../../../src/infrastructure/logging/silent-logger';

describe('SilentLogger: the default of every piece that can log', () => {
  it('can be injected wherever a Logger is asked for', () => {
    expectTypeOf<SilentLogger>().toMatchTypeOf<Logger>();
  });

  it('writes nothing at any level', () => {
    const output = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const logger = new SilentLogger();

    logger.debug();
    logger.info();
    logger.warn();
    logger.error();

    expect(output).not.toHaveBeenCalled();
    output.mockRestore();
  });

  it('accepts the message and context any caller passes', () => {
    const logger: Logger = new SilentLogger();
    expect(logger.error('payment_failed', { orderId: 'ord-1001' })).toBeUndefined();
  });
});
