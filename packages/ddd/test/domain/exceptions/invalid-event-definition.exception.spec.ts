import { describe, expect, it, vi } from 'vitest';
import { InvalidEventDefinitionException } from '../../../src/domain/exceptions/invalid-event-definition.exception';
import { DomainException } from '../../../src/domain/exceptions/domain.exception';

describe('InvalidEventDefinitionException', () => {
  it('names the event class that forgot its static eventName', () => {
    const exception = new InvalidEventDefinitionException('OrderShipped');

    expect(exception.message).toBe('OrderShipped must declare a static eventName');
    expect(exception.code).toBe('DOM005');
  });

  it('is a domain exception with the code DOM005', () => {
    const exception = new InvalidEventDefinitionException('OrderShipped');

    expect(exception).toBeInstanceOf(DomainException);
    expect(exception.description).toBe(
      'Domain Exception (DOM000), Invalid Event Definition (DOM005)',
    );
  });

  it('is recognized when thrown by the other build, also as a domain exception', async () => {
    vi.resetModules();
    const otherCopy =
      await import('../../../src/domain/exceptions/invalid-event-definition.exception');
    const thrownByOtherCopy = new otherCopy.InvalidEventDefinitionException('OrderShipped');

    expect(thrownByOtherCopy instanceof InvalidEventDefinitionException).toBe(true);
    expect(thrownByOtherCopy instanceof DomainException).toBe(true);
    expect(new DomainException('x') instanceof otherCopy.InvalidEventDefinitionException).toBe(
      false,
    );
  });
});
