const INSTANCE_CODES: unique symbol = Symbol.for('@archi-code/domain/exception-codes.v1');
const CLASS_CODE: unique symbol = Symbol.for('@archi-code/domain/exception-class-code.v1');

export class ExceptionBrand {
  static readonly anyCode = '*';

  static brandClass(exceptionClass: object, code: string): void {
    Object.defineProperty(exceptionClass, CLASS_CODE, { value: code });
  }

  static brandInstance(exception: object, codes: readonly string[]): void {
    Object.defineProperty(exception, INSTANCE_CODES, { value: Object.freeze([...codes]) });
  }

  static matches(exceptionClass: object, candidate: unknown): boolean {
    if (!Object.prototype.hasOwnProperty.call(exceptionClass, CLASS_CODE)) {
      return false;
    }
    if (typeof candidate !== 'object' || candidate === null) {
      return false;
    }
    const codes = (candidate as Record<symbol, unknown>)[INSTANCE_CODES];
    if (!Array.isArray(codes)) {
      return false;
    }
    const code = (exceptionClass as Record<symbol, unknown>)[CLASS_CODE];
    return code === ExceptionBrand.anyCode || codes.includes(code);
  }
}
