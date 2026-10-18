import { InfrastructureException } from './infrastructure.exception';
import { ExceptionBrand } from '../brand/exception-brand';
import { ExceptionCode } from '../exception-code';

export class UnknownEventException extends InfrastructureException {
  static {
    ExceptionBrand.brandClass(this, ExceptionCode.UnknownEvent);
  }

  constructor(eventName: string) {
    super(`Unknown event "${eventName}": register it before reading it.`, [
      ExceptionCode.UnknownEvent,
    ]);
  }
}
