import { ExceptionCode } from './exception-code';

export abstract class AbstractException extends Error {
  private readonly exceptionCodes: Array<ExceptionCode | string>;
  public readonly code: ExceptionCode | string;
  public readonly timestamp: Date;

  constructor(message: string, exceptionCodes: Array<ExceptionCode | string>) {
    super(message);
    this.name = this.constructor.name;
    this.exceptionCodes = exceptionCodes;
    this.code = exceptionCodes.length > 0 ? exceptionCodes[exceptionCodes.length - 1] : ExceptionCode.ErrorException;
    this.timestamp = new Date();
    Error.captureStackTrace(this, this.constructor);
  }

  static readonly ExceptionCodeStrings: Record<ExceptionCode, string> = Object.keys(ExceptionCode)
    .filter((key) => isNaN(Number(key))) // Filtrar las claves no numéricas
    .reduce(
      (acc, key) => {
        const value = ExceptionCode[key as keyof typeof ExceptionCode];
        acc[value as ExceptionCode] = key.replace(/([A-Z])/g, ' $1').trim(); // Convertir a mensaje de error legible
        return acc;
      },
      {} as Record<ExceptionCode, string>,
    );

  public get description(): string {
    return this.exceptionCodes
      .map((code) => {
        const codeString = AbstractException.ExceptionCodeStrings[code] ?? this.name;
        return `${codeString} (${code})`;
      })
      .join(', ');
  }

  print(): string {
    return `[${this.description}]: ${this.message}, ${this.timestamp}`;
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
