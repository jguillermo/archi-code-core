import { DomainException } from './domain.exception';
import { ExceptionCode } from '../exception-code';

export class AggregateNotFoundException extends DomainException {
  constructor(entity: string, id: string) {
    super(`${entity} with ID ${id} not found.`, [ExceptionCode.AggregateNotFound]);
  }
}
