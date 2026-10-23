import { ExceptionCode } from './exception-code';
import { ExceptionBrand } from './brand/exception-brand';

export interface ExceptionOptions {
  cause?: unknown;
}

export abstract class AbstractException extends Error {
  declare readonly cause?: unknown;
  private readonly exceptionCodes: (ExceptionCode | string)[];
  public readonly code: ExceptionCode | string;
  private readonly createdAt: number;

  static {
    ExceptionBrand.brandClass(this, ExceptionBrand.anyCode);
  }

  static [Symbol.hasInstance](candidate: unknown): boolean {
    return (
      Function.prototype[Symbol.hasInstance].call(this, candidate) ||
      ExceptionBrand.matches(this, candidate)
    );
  }

  constructor(
    message: string,
    exceptionCodes: (ExceptionCode | string)[],
    options: ExceptionOptions = {},
  ) {
    super(message);
    this.name = this.constructor.name;
    this.exceptionCodes = exceptionCodes;
    this.code =
      exceptionCodes.length > 0
        ? exceptionCodes[exceptionCodes.length - 1]
        : ExceptionCode.ErrorException;
    this.createdAt = Date.now();
    if ('cause' in options) {
      Object.defineProperty(this, 'cause', {
        value: options.cause,
        writable: true,
        configurable: true,
      });
    }
    ExceptionBrand.brandInstance(this, exceptionCodes);
    Error.captureStackTrace?.(this, this.constructor);
  }

  static readonly ExceptionCodeStrings: Record<ExceptionCode, string> = Object.keys(ExceptionCode)
    .filter((key) => isNaN(Number(key)))
    .reduce(
      (acc, key) => {
        const value = ExceptionCode[key as keyof typeof ExceptionCode];
        acc[value as ExceptionCode] = key.replace(/([A-Z])/g, ' $1').trim();
        return acc;
      },
      {} as Record<ExceptionCode, string>,
    );

  public get timestamp(): Date {
    return new Date(this.createdAt);
  }

  public get description(): string {
    return this.exceptionCodes
      .map((code) => {
        const codeString =
          AbstractException.ExceptionCodeStrings[code as ExceptionCode] ?? this.name;
        return `${codeString} (${code})`;
      })
      .join(', ');
  }

  print(): string {
    return `[${this.description}]: ${this.message}, ${this.timestamp.toISOString()}`;
  }

  toJSON(): {
    name: string;
    message: string;
    code: string;
    description: string;
    timestamp: string;
  } {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      description: this.description,
      timestamp: this.timestamp.toISOString(),
    };
  }
}
