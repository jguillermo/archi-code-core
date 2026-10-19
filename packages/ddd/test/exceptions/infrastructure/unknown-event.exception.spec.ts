import { describe, expect, it, vi } from 'vitest';
import { UnknownEventException } from '../../../src/exceptions/infrastructure/unknown-event.exception';
import { InfrastructureException } from '../../../src/exceptions/infrastructure/infrastructure.exception';
import { InternalErrorException } from '../../../src/exceptions/infrastructure/internal-error.exception';
import { ExceptionCode } from '../../../src/exceptions/exception-code';

const knownEvents = new Set(['OrderPlaced', 'OrderShipped']);

function readMessage(message: { eventName: string }): string {
  if (!knownEvents.has(message.eventName)) {
    throw new UnknownEventException(message.eventName);
  }
  return message.eventName;
}

describe('UnknownEventException', () => {
  it('is what a broker consumer throws for a message no handler knows', () => {
    expect(readMessage({ eventName: 'OrderPlaced' })).toBe('OrderPlaced');
    expect(() => readMessage({ eventName: 'OrderRefunded' })).toThrow(UnknownEventException);
    expect(() => readMessage({ eventName: 'OrderRefunded' })).toThrow(
      'Unknown event "OrderRefunded": register it before reading it.',
    );
  });

  it('is an infrastructure exception with the code INF002', () => {
    const exception = new UnknownEventException('OrderRefunded');
    expect(exception).toBeInstanceOf(InfrastructureException);
    expect(exception).not.toBeInstanceOf(InternalErrorException);
    expect(exception.code).toBe(ExceptionCode.UnknownEvent);
    expect(exception.description).toBe('Infrastructure Exception (INF000), Unknown Event (INF002)');
  });

  it('is recognized when thrown by another copy of the package', async () => {
    vi.resetModules();
    const other = await import('../../../src/exceptions/infrastructure/unknown-event.exception');
    expect(new other.UnknownEventException('x')).toBeInstanceOf(UnknownEventException);
  });
});
