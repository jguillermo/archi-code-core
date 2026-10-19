import {
  AbstractException,
  AggregateNotFoundException,
  ApplicationException,
  ConcurrencyException,
  DomainException,
  ExceptionCode,
  NotAllowedException,
  RequiredValueException,
  TypePrimitiveException,
  ValidationException,
} from '../../exceptions';
import type { ValidationIssue } from '../../exceptions';
import type { Logger } from '../../application/index';
import { SilentLogger } from '../logging/silent-logger';

export interface HttpErrorBody {
  code: string;
  message: string;
  errors?: readonly ValidationIssue[];
}

export interface HttpError {
  status: number;
  body: HttpErrorBody;
}

export interface HttpErrorMapperOptions {
  readonly statusByCode?: Readonly<Record<string, number>>;
  readonly logger?: Logger;
}

const INTERNAL_MESSAGE = 'Internal server error';

export class HttpErrorMapper {
  private readonly statusByCode: Readonly<Record<string, number>>;
  private readonly logger: Logger;

  constructor({ statusByCode = {}, logger = new SilentLogger() }: HttpErrorMapperOptions = {}) {
    this.statusByCode = statusByCode;
    this.logger = logger;
  }

  map(error: unknown): HttpError {
    const mapped = this.toHttpError(error);
    const { status, body } = mapped;
    if (status >= 500) {
      this.logger.error('http_request_failed', { status, code: body.code, error });
    } else {
      this.logger.debug('http_request_rejected', { status, code: body.code });
    }
    return mapped;
  }

  private toHttpError(error: unknown): HttpError {
    if (!(error instanceof AbstractException)) {
      return {
        status: 500,
        body: { code: ExceptionCode.ErrorException, message: INTERNAL_MESSAGE },
      };
    }
    const status = Object.prototype.hasOwnProperty.call(this.statusByCode, error.code)
      ? this.statusByCode[error.code]
      : HttpErrorMapper.defaultStatus(error);
    if (status >= 500) {
      return { status, body: { code: error.code, message: INTERNAL_MESSAGE } };
    }
    if (error instanceof ValidationException) {
      return { status, body: { code: error.code, message: error.message, errors: error.errors } };
    }
    return { status, body: { code: error.code, message: error.message } };
  }

  private static defaultStatus(error: AbstractException): number {
    if (error instanceof AggregateNotFoundException) {
      return 404;
    }
    if (error instanceof NotAllowedException) {
      return 403;
    }
    if (error instanceof ConcurrencyException) {
      return 409;
    }
    if (error instanceof TypePrimitiveException || error instanceof RequiredValueException) {
      return 400;
    }
    if (error instanceof DomainException) {
      return 422;
    }
    if (error instanceof ApplicationException) {
      return 400;
    }
    return 500;
  }
}
