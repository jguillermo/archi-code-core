import { AggregateNotFoundException } from '../application/aggregate-not-found.exception';
import { ApplicationException } from '../application/application.exception';
import { ConcurrencyException } from '../application/concurrency.exception';
import { NotAllowedException } from '../application/not-allowed.exception';
import { DomainException } from '../../../domain/exceptions/domain.exception';
import { RequiredValueException } from '../../../domain/exceptions/required-value.exception';
import { TypePrimitiveException } from '../../../domain/exceptions/type-primitive.exception';
import { ExceptionKind } from './exception-kind';

export class ExceptionClassifier {
  static classify(error: unknown): ExceptionKind {
    if (error instanceof AggregateNotFoundException) {
      return ExceptionKind.NotFound;
    }
    if (error instanceof NotAllowedException) {
      return ExceptionKind.NotAllowed;
    }
    if (error instanceof ConcurrencyException) {
      return ExceptionKind.Conflict;
    }
    if (error instanceof TypePrimitiveException || error instanceof RequiredValueException) {
      return ExceptionKind.Malformed;
    }
    if (error instanceof DomainException) {
      return ExceptionKind.Invalid;
    }
    if (error instanceof ApplicationException) {
      return ExceptionKind.Rejected;
    }
    return ExceptionKind.Internal;
  }
}
