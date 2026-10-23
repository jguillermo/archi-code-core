import {
  ApplicationException,
  AggregateNotFoundException,
  ConcurrencyException,
  NotAllowedException,
  UnexpectedErrorException,
} from '../../../application/index';
import {
  DomainException,
  InvalidEventDefinitionException,
  RequiredValueException,
  TypePrimitiveException,
} from '../../../domain/index';
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
    if (
      error instanceof UnexpectedErrorException ||
      error instanceof InvalidEventDefinitionException
    ) {
      return ExceptionKind.Internal;
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
