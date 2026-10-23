import { describe, expect, it, vi } from 'vitest';
import { InfrastructureExceptionCode } from '../../../src/infrastructure/exceptions/infrastructure-exception-code';
import { EventDeliveryException } from '../../../src/infrastructure/exceptions/event-delivery.exception';
import { InfrastructureException } from '../../../src/infrastructure/exceptions/infrastructure.exception';

describe('EventDeliveryException', () => {
  it('reports how many consumers of an event failed and keeps every error', () => {
    const offline = new Error('warehouse offline');
    const bounced = new Error('mailbox full');
    const exception = new EventDeliveryException('OrderPlaced', [offline, bounced], 3);
    expect(exception.message).toBe('2 of 3 consumers of "OrderPlaced" failed.');
    expect(exception.errors).toStrictEqual([offline, bounced]);
  });

  it('keeps a frozen copy of the errors', () => {
    const errors: unknown[] = [new Error('warehouse offline')];
    const exception = new EventDeliveryException('OrderPlaced', errors, 1);
    errors.push(new Error('later'));
    expect(exception.errors).toHaveLength(1);
    expect(Object.isFrozen(exception.errors)).toBe(true);
  });

  it('is an infrastructure exception with the code INF003', () => {
    const exception = new EventDeliveryException('OrderPlaced', [], 0);
    expect(exception).toBeInstanceOf(InfrastructureException);
    expect(exception.code).toBe(InfrastructureExceptionCode.EventDelivery);
    expect(exception.description).toBe(
      'Infrastructure Exception (INF000), Event Delivery (INF003)',
    );
  });

  it('is recognized when thrown by another copy of the package', async () => {
    vi.resetModules();
    const other = await import('../../../src/infrastructure/exceptions/event-delivery.exception');
    expect(new other.EventDeliveryException('OrderPlaced', [], 0)).toBeInstanceOf(
      EventDeliveryException,
    );
  });
});
