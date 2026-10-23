import { ExceptionBrand } from './brand/exception-brand';

export interface ExceptionOptions {
  cause?: unknown;
}

export type ExceptionCodeNames = Readonly<Record<string, string>>;

export abstract class AbstractException extends Error {
  private static readonly fallbackCode = 'E000';
  declare readonly cause?: unknown;
  private readonly exceptionCodes: string[];
  private readonly codeNames: ExceptionCodeNames;
  public readonly code: string;
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
    exceptionCodes: string[],
    options: ExceptionOptions = {},
    codeNames: ExceptionCodeNames = {},
  ) {
    super(message);
    this.name = this.constructor.name;
    this.exceptionCodes = exceptionCodes;
    this.codeNames = codeNames;
    this.code =
      exceptionCodes.length > 0
        ? exceptionCodes[exceptionCodes.length - 1]
        : AbstractException.fallbackCode;
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

  public get timestamp(): Date {
    return new Date(this.createdAt);
  }

  public get description(): string {
    return this.exceptionCodes.map((code) => `${this.labelOf(code)} (${code})`).join(', ');
  }

  private labelOf(code: string): string {
    const name = Object.keys(this.codeNames).find((key) => this.codeNames[key] === code);
    return name === undefined ? this.name : name.replace(/([A-Z])/g, ' $1').trim();
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
