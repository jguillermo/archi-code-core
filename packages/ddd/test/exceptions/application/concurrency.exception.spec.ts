import { describe, expect, it, vi } from 'vitest';
import { ConcurrencyException } from '../../../src/exceptions/application/concurrency.exception';
import { ApplicationException } from '../../../src/exceptions/application/application.exception';
import { DomainException } from '../../../src/exceptions/domain/domain.exception';
import { ExceptionCode } from '../../../src/exceptions/exception-code';

interface StoredOrder {
  id: string;
  status: string;
  version: number;
}

class OrderTable {
  private readonly rows = new Map<string, StoredOrder>([
    ['o-1', { id: 'o-1', status: 'placed', version: 3 }],
  ]);

  update(order: StoredOrder): void {
    const stored = this.rows.get(order.id);
    if (stored?.version !== order.version) {
      throw new ConcurrencyException('Order', order.id, order.version);
    }
    this.rows.set(order.id, { ...order, version: order.version + 1 });
  }
}

describe('ConcurrencyException', () => {
  it('is what a repository throws when another user saved the aggregate first', () => {
    const table = new OrderTable();
    table.update({ id: 'o-1', status: 'paid', version: 3 });

    const staleSave = () => table.update({ id: 'o-1', status: 'cancelled', version: 3 });
    expect(staleSave).toThrow(ConcurrencyException);
    expect(staleSave).toThrow('Order with ID o-1 was changed by someone else: expected version 3.');
  });

  it('is an application exception with the code APP001, not a domain rule', () => {
    const exception = new ConcurrencyException('Order', 'o-1', 3);
    expect(exception).toBeInstanceOf(ApplicationException);
    expect(exception).not.toBeInstanceOf(DomainException);
    expect(exception.code).toBe(ExceptionCode.ConcurrencyConflict);
    expect(exception.description).toBe(
      'Application Exception (APP000), Concurrency Conflict (APP001)',
    );
  });

  it('is recognized when thrown by another copy of the package', async () => {
    vi.resetModules();
    const other = await import('../../../src/exceptions/application/concurrency.exception');
    const fromOtherCopy = new other.ConcurrencyException('Order', 'o-1', 3);
    expect(other.ConcurrencyException).not.toBe(ConcurrencyException);
    expect(fromOtherCopy).toBeInstanceOf(ConcurrencyException);
    expect(fromOtherCopy).toBeInstanceOf(ApplicationException);
  });
});
