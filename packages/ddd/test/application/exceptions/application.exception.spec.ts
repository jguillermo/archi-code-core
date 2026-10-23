import { describe, expect, it, vi } from 'vitest';
import { ApplicationException } from '../../../src/application/exceptions/application.exception';
import { AbstractException } from '../../../src/shared/exceptions/abstract.exception';
import { DomainException } from '../../../src/domain/exceptions/domain.exception';

class InvoiceAlreadySentException extends ApplicationException {
  constructor(invoiceId: string) {
    super(`Invoice ${invoiceId} was already sent`, ['INV001']);
  }
}

class SendInvoice {
  private readonly sent = new Set<string>(['inv-1']);

  run(invoiceId: string): void {
    if (this.sent.has(invoiceId)) {
      throw new InvoiceAlreadySentException(invoiceId);
    }
    this.sent.add(invoiceId);
  }
}

describe('ApplicationException', () => {
  it('reports a use case that cannot run with the code APP000', () => {
    const exception = new ApplicationException('The user has no permission to export');

    expect(exception).toBeInstanceOf(AbstractException);
    expect(exception.name).toBe('ApplicationException');
    expect(exception.code).toBe('APP000');
    expect(exception.description).toBe('Application Exception (APP000)');
  });

  it('lets a use case stop with its own exception and code', () => {
    const sendInvoice = new SendInvoice();

    expect(() => sendInvoice.run('inv-2')).not.toThrow();
    expect(() => sendInvoice.run('inv-2')).toThrow(InvoiceAlreadySentException);
    expect(() => sendInvoice.run('inv-1')).toThrow(ApplicationException);
    expect(new InvoiceAlreadySentException('inv-1')).toMatchObject({
      code: 'INV001',
      message: 'Invoice inv-1 was already sent',
      description: 'Application Exception (APP000), InvoiceAlreadySentException (INV001)',
    });
  });

  it('keeps the error that made the use case fail', () => {
    const cause = new DomainException('Stock cannot be negative');
    const exception = new ApplicationException('Cannot place the order', [], { cause });

    expect(exception.cause).toBe(cause);
  });

  it('is recognized when thrown by the other build, and is not a domain exception', async () => {
    vi.resetModules();
    const otherCopy = await import('../../../src/application/exceptions/application.exception');
    const thrownByOtherCopy = new otherCopy.ApplicationException('Missing order id');

    expect(thrownByOtherCopy instanceof ApplicationException).toBe(true);
    expect(thrownByOtherCopy instanceof DomainException).toBe(false);
  });
});
