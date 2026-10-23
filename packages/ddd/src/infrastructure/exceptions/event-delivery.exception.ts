import { ExceptionBrand } from '../../shared/index';
import { InfrastructureExceptionCode } from './infrastructure-exception-code';
import { InfrastructureException } from './infrastructure.exception';

export class EventDeliveryException extends InfrastructureException {
  static {
    ExceptionBrand.brandClass(this, InfrastructureExceptionCode.EventDelivery);
  }

  readonly errors: readonly unknown[];

  constructor(eventName: string, errors: readonly unknown[], consumers: number) {
    super(`${errors.length} of ${consumers} consumers of "${eventName}" failed.`, [
      InfrastructureExceptionCode.EventDelivery,
    ]);
    this.errors = Object.freeze([...errors]);
  }
}
