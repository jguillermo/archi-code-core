import { describe, expect, it, vi } from 'vitest';
import { Validations } from '@archi-code/validation';
import { NumberType, Required, StringType } from '../../../../src/domain/index';
import { AggregateNotFoundException } from '../../../../src/application/exceptions/aggregate-not-found.exception';
import { ApplicationException } from '../../../../src/application/exceptions/application.exception';
import { ConcurrencyException } from '../../../../src/application/exceptions/concurrency.exception';
import { DomainException } from '../../../../src/domain/exceptions/domain.exception';
import { EventDeliveryException } from '../../../../src/infrastructure/exceptions/event-delivery.exception';
import { InfrastructureException } from '../../../../src/infrastructure/exceptions/infrastructure.exception';
import { InternalErrorException } from '../../../../src/infrastructure/exceptions/internal-error.exception';
import { InvalidEventDefinitionException } from '../../../../src/domain/exceptions/invalid-event-definition.exception';
import { UnexpectedErrorException } from '../../../../src/application/exceptions/unexpected-error.exception';
import { NotAllowedException } from '../../../../src/application/exceptions/not-allowed.exception';
import { RequiredValueException } from '../../../../src/domain/exceptions/required-value.exception';
import { TypePrimitiveException } from '../../../../src/domain/exceptions/type-primitive.exception';
import { UnknownEventException } from '../../../../src/infrastructure/exceptions/unknown-event.exception';
import { ValidationException } from '../../../../src/domain/exceptions/validation.exception';
import { ExceptionClassifier } from '../../../../src/infrastructure/exceptions/kind/exception-classifier';
import { ExceptionKind } from '../../../../src/infrastructure/exceptions/kind/exception-kind';

@Validations([{ validator: 'isEmail' }])
class Email extends Required(StringType) {}

class Quantity extends Required(NumberType) {}

class OrderShippedException extends DomainException {
  constructor(orderId: string) {
    super(`Order ${orderId} is already shipped`, ['ORD001']);
  }
}

class EmailAlreadyUsedException extends ApplicationException {
  constructor(email: string) {
    super(`Email ${email} is already used`, ['USR001']);
  }
}

const orderId = '9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c';

function thrownBy(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  throw new Error('expected the call to throw');
}

describe('ExceptionClassifier: the kind of failure an entry point answers with', () => {
  describe('failures the caller can fix or must be told about', () => {
    it('an order that does not exist is not found', () => {
      expect(ExceptionClassifier.classify(new AggregateNotFoundException('Order', orderId))).toBe(
        ExceptionKind.NotFound,
      );
    });

    it('a customer cancelling an order of another customer is not allowed', () => {
      expect(
        ExceptionClassifier.classify(new NotAllowedException('cus-luis cannot cancel this order')),
      ).toBe(ExceptionKind.NotAllowed);
    });

    it('a save that lost an optimistic concurrency race is a conflict', () => {
      expect(ExceptionClassifier.classify(new ConcurrencyException('Order', orderId, 3))).toBe(
        ExceptionKind.Conflict,
      );
    });

    it('a quantity sent as a word is malformed', () => {
      const error = thrownBy(() => new Quantity('three' as unknown as number));
      expect(error).toBeInstanceOf(TypePrimitiveException);
      expect(ExceptionClassifier.classify(error)).toBe(ExceptionKind.Malformed);
    });

    it('a missing required field is malformed', () => {
      const error = thrownBy(() => new Email(null as unknown as string));
      expect(error).toBeInstanceOf(RequiredValueException);
      expect(ExceptionClassifier.classify(error)).toBe(ExceptionKind.Malformed);
    });

    it('a sign-up with an email that breaks its rule is invalid', () => {
      const error = thrownBy(() => new Email('ana'));
      expect(error).toBeInstanceOf(ValidationException);
      expect(ExceptionClassifier.classify(error)).toBe(ExceptionKind.Invalid);
    });

    it('a business rule of the domain, such as adding a line to a shipped order, is invalid', () => {
      expect(ExceptionClassifier.classify(new OrderShippedException(orderId))).toBe(
        ExceptionKind.Invalid,
      );
    });

    it('an error of a use case, such as an email already used, is rejected', () => {
      expect(ExceptionClassifier.classify(new EmailAlreadyUsedException('ana@example.com'))).toBe(
        ExceptionKind.Rejected,
      );
    });
  });

  describe('failures the caller cannot fix', () => {
    it.each([
      [
        'a database timeout wrapped by the repository',
        new InfrastructureException('Mongo timeout on orders', ['DB001']),
      ],
      ['an internal error', new InternalErrorException('connection string mongodb://admin:x@db')],
      [
        'an unknown error wrapped by a use case',
        new UnexpectedErrorException('PlaceOrder: Cannot read properties of undefined'),
      ],
      [
        'an event class without a static eventName',
        new InvalidEventDefinitionException('OrderPlaced'),
      ],
      ['an unknown event', new UnknownEventException('OrderCancelled')],
      ['a failed event delivery', new EventDeliveryException('OrderPlaced', [], 0)],
      ['a bug that throws a TypeError', new TypeError('Cannot read properties of undefined')],
      ['a library that throws a string', 'boom'],
      ['a rejected promise without reason', undefined],
    ])('%s is internal', (_, error) => {
      expect(ExceptionClassifier.classify(error)).toBe(ExceptionKind.Internal);
    });
  });

  it('classifies an exception thrown by another copy of the package (CJS and ESM builds side by side)', async () => {
    vi.resetModules();
    const otherCopy = {
      ...(await import('../../../../src/application/index')),
      ...(await import('../../../../src/domain/index')),
    };
    expect(otherCopy.AggregateNotFoundException).not.toBe(AggregateNotFoundException);
    expect(
      ExceptionClassifier.classify(new otherCopy.AggregateNotFoundException('Order', orderId)),
    ).toBe(ExceptionKind.NotFound);
    expect(
      ExceptionClassifier.classify(
        new otherCopy.ValidationException([{ field: 'email', message: 'Email: invalid' }]),
      ),
    ).toBe(ExceptionKind.Invalid);
    expect(
      ExceptionClassifier.classify(new otherCopy.ConcurrencyException('Order', orderId, 2)),
    ).toBe(ExceptionKind.Conflict);
  });
});
