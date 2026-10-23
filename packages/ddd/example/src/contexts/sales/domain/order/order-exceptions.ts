import { DomainException } from '../../../../ddd/domain';

export class OrderLineCountException extends DomainException {
  constructor(count: number) {
    super(`An order has 1 to 20 lines, not ${count}`, ['SAL001']);
  }
}

export class DuplicateSkuException extends DomainException {
  constructor(sku: string) {
    super(`The SKU ${sku} appears in more than one line`, ['SAL002']);
  }
}

export class OrderTotalOutOfRangeException extends DomainException {
  constructor(cents: number) {
    super(`An order total goes from 0.01 to 10000.00, not ${(cents / 100).toFixed(2)}`, ['SAL003']);
  }
}

export class OrderNotModifiableException extends DomainException {
  constructor(orderId: string, status: string) {
    super(`Order ${orderId} is ${status} and can no longer change`, ['SAL004']);
  }
}

export class OrderCannotBeCancelledException extends DomainException {
  constructor(orderId: string, status: string) {
    super(`Order ${orderId} is ${status} and can no longer be cancelled`, ['SAL005']);
  }
}

export class OrderOwnershipException extends DomainException {
  constructor(orderId: string) {
    super(`Only the customer who placed order ${orderId} can cancel it`, ['SAL006']);
  }
}

export class OrderLineNotFoundException extends DomainException {
  constructor(orderId: string, lineNumber: number) {
    super(`Order ${orderId} has no line ${lineNumber}`, ['SAL007']);
  }
}

export class OrderNotDiscardableException extends DomainException {
  constructor(orderId: string) {
    super(`Order ${orderId} is not cancelled, so it cannot be discarded`, ['SAL008']);
  }
}

export class UnknownCouponException extends DomainException {
  constructor(code: string) {
    super(`The coupon ${code} does not exist`, ['SAL009']);
  }
}
