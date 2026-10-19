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

export interface HttpErrorBody {
  code: string;
  message: string;
  errors?: readonly ValidationIssue[];
}

export interface HttpError {
  status: number;
  body: HttpErrorBody;
}

const INTERNAL_MESSAGE = 'Internal server error';

export class HttpErrorMapper {
  constructor(private readonly statusByCode: Readonly<Record<string, number>> = {}) {}

  map(error: unknown): HttpError {
    if (!(error instanceof AbstractException)) {
      return {
        status: 500,
        body: { code: ExceptionCode.ErrorException, message: INTERNAL_MESSAGE },
      };
    }
    const status = this.statusByCode[error.code] ?? HttpErrorMapper.defaultStatus(error);
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
