import { ExceptionBrand } from '../../shared/index';
import { InfrastructureExceptionCode } from './infrastructure-exception-code';
import { InfrastructureException } from './infrastructure.exception';

export class UnknownEventException extends InfrastructureException {
  static {
    ExceptionBrand.brandClass(this, InfrastructureExceptionCode.UnknownEvent);
  }

  constructor(eventName: string) {
    super(`Unknown event "${eventName}": register it before reading it.`, [
      InfrastructureExceptionCode.UnknownEvent,
    ]);
  }
}
