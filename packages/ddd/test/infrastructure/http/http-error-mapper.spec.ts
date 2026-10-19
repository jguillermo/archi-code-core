import { describe, expect, it, vi } from 'vitest';
import { Validations } from '@archi-code/validation';
import { NumberType, Required, StringType } from '../../../src/domain/index';
import {
  AggregateNotFoundException,
  ApplicationException,
  ConcurrencyException,
  NotAllowedException,
  DomainException,
  InfrastructureException,
  InternalErrorException,
  RequiredValueException,
  TypePrimitiveException,
  UnknownEventException,
  ValidationException,
} from '../../../src/exceptions/index';
import { HttpErrorMapper } from '../../../src/infrastructure/http/http-error-mapper';

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

const internal = { code: 'E000', message: 'Internal server error' };

describe('HttpErrorMapper: the error handler of an HTTP controller', () => {
  const mapper = new HttpErrorMapper();

  describe('client errors keep the code and the message', () => {
    it('an order that does not exist is a 404', () => {
      expect(mapper.map(new AggregateNotFoundException('Order', orderId))).toEqual({
        status: 404,
        body: { code: 'APP002', message: `Order with ID ${orderId} not found.` },
      });
    });

    it('a sign-up with a malformed email is a 422 listing every broken rule', () => {
      const error = thrownBy(() => new Email('ana'));
      expect(mapper.map(error)).toEqual({
        status: 422,
        body: {
          code: 'DOM001',
          message: 'Validation failed, Email: Value does not satisfy isEmail',
          errors: [
            { field: null, code: 'isEmail', message: 'Email: Value does not satisfy isEmail' },
          ],
        },
      });
    });

    it('a quantity sent as a word is a 400', () => {
      const error = thrownBy(() => new Quantity('three' as unknown as number));
      expect(error).toBeInstanceOf(TypePrimitiveException);
      expect(mapper.map(error)).toEqual({
        status: 400,
        body: {
          code: 'DOM003',
          message: 'Validation Error: Expected a valid Number, but received "three".',
        },
      });
    });

    it('a missing required field is a 400', () => {
      const error = thrownBy(() => new Email(''));
      expect(error).toBeInstanceOf(RequiredValueException);
      expect(mapper.map(error)).toMatchObject({ status: 400, body: { code: 'DOM004' } });
    });

    it('a customer cancelling an order of another customer is a 403', () => {
      expect(mapper.map(new NotAllowedException('cus-luis cannot cancel this order'))).toEqual({
        status: 403,
        body: { code: 'APP003', message: 'cus-luis cannot cancel this order' },
      });
    });

    it('a save that lost an optimistic concurrency race is a 409', () => {
      expect(mapper.map(new ConcurrencyException('Order', orderId, 3))).toEqual({
        status: 409,
        body: {
          code: 'APP001',
          message: `Order with ID ${orderId} was changed by someone else: expected version 3.`,
        },
      });
    });

    it('a business rule of the domain, such as adding a line to a shipped order, is a 422', () => {
      expect(mapper.map(new OrderShippedException(orderId))).toEqual({
        status: 422,
        body: { code: 'ORD001', message: `Order ${orderId} is already shipped` },
      });
    });

    it('an error of a use case, such as an email already used, is a 400', () => {
      expect(mapper.map(new EmailAlreadyUsedException('ana@example.com'))).toEqual({
        status: 400,
        body: { code: 'USR001', message: 'Email ana@example.com is already used' },
      });
    });
  });

  describe('server errors never leak their message', () => {
    it('a database timeout wrapped by the repository is a 500 with a generic message', () => {
      const error = new InfrastructureException('Mongo timeout on orders at 10.0.0.12', ['DB001']);
      expect(mapper.map(error)).toEqual({
        status: 500,
        body: { code: 'DB001', message: 'Internal server error' },
      });
    });

    it.each([
      [
        'an internal error',
        new InternalErrorException('connection string mongodb://admin:x@db'),
        'INF001',
      ],
      ['an unknown event', new UnknownEventException('order.cancelled'), 'INF002'],
    ])('%s is a 500 with a generic message', (_, error, code) => {
      expect(mapper.map(error)).toEqual({
        status: 500,
        body: { code, message: 'Internal server error' },
      });
    });

    it.each([
      ['a bug that throws a TypeError', new TypeError('Cannot read properties of undefined')],
      ['a library that throws a string', 'boom'],
      ['a rejected promise without reason', undefined],
    ])('%s is a 500 with the generic code E000', (_, error) => {
      expect(mapper.map(error)).toEqual({ status: 500, body: internal });
    });
  });

  describe('overriding the status of a code', () => {
    const custom = new HttpErrorMapper({ ORD001: 403, APP002: 410, USR001: 503 });

    it('maps your own code to the status your API documents', () => {
      expect(custom.map(new OrderShippedException(orderId))).toEqual({
        status: 403,
        body: { code: 'ORD001', message: `Order ${orderId} is already shipped` },
      });
    });

    it('changes the status of a built-in code', () => {
      expect(custom.map(new AggregateNotFoundException('Order', orderId)).status).toBe(410);
    });

    it('an override to a server status also hides the message', () => {
      expect(custom.map(new EmailAlreadyUsedException('ana@example.com'))).toEqual({
        status: 503,
        body: { code: 'USR001', message: 'Internal server error' },
      });
    });

    it('leaves the codes it does not mention with their default status', () => {
      expect(custom.map(new ConcurrencyException('Order', orderId, 1)).status).toBe(409);
    });
  });

  it('maps an exception thrown by another copy of the package (CJS and ESM builds side by side)', async () => {
    vi.resetModules();
    const otherCopy = await import('../../../src/exceptions/index');
    expect(otherCopy.AggregateNotFoundException).not.toBe(AggregateNotFoundException);
    expect(mapper.map(new otherCopy.AggregateNotFoundException('Order', orderId)).status).toBe(404);
    expect(
      mapper.map(
        new otherCopy.ValidationException([{ field: 'email', message: 'Email: invalid' }]),
      ),
    ).toEqual({
      status: 422,
      body: {
        code: 'DOM001',
        message: 'Validation failed, email: Email: invalid',
        errors: [{ field: 'email', code: 'DOM001', message: 'Email: invalid' }],
      },
    });
    expect(mapper.map(new otherCopy.ConcurrencyException('Order', orderId, 2)).status).toBe(409);
  });

  it('keeps every field of a sign-up form so the client can mark each input', () => {
    const issues = [
      { field: 'name', message: 'CustomerName: too short' },
      { field: 'age', message: 'Age: negative' },
    ];
    expect(mapper.map(new ValidationException(issues))).toMatchObject({
      status: 422,
      body: { errors: issues },
    });
  });
});
