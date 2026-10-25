import { DomainException } from '../../../../ddd/domain';

export class OrderLineCountOutOfRange extends DomainException {
  constructor(count: number) {
    super(`An order has 1 to 20 lines, not ${count}`, ['SAL001']);
  }
}
