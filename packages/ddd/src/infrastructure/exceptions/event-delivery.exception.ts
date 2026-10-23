import { InfrastructureException } from './infrastructure.exception';
import { ExceptionBrand } from '../../shared/exceptions/brand/exception-brand';
import { ExceptionCode } from '../../shared/exceptions/exception-code';

export class EventDeliveryException extends InfrastructureException {
  static {
    ExceptionBrand.brandClass(this, ExceptionCode.EventDelivery);
  }

  readonly errors: readonly unknown[];

  constructor(eventName: string, errors: readonly unknown[], consumers: number) {
    super(`${errors.length} of ${consumers} consumers of "${eventName}" failed.`, [
      ExceptionCode.EventDelivery,
    ]);
    this.errors = Object.freeze([...errors]);
  }
}
