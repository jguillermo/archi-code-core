import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { Validations } from '@archi-code/validation';
import type { ValidationResult } from '@archi-code/validation';
import { EnumType } from '../../../src/domain/type/enum-type';
import { AbstractType } from '../../../src/domain/type/abstract-type';
import { Required } from '../../../src/domain/type/required/required';
import { TypePrimitiveException } from '../../../src/exceptions/domain/type-primitive.exception';
import { RequiredValueException } from '../../../src/exceptions/domain/required-value.exception';
import { ValidationException } from '../../../src/exceptions/domain/validation.exception';

enum OrderStatusOption {
  PENDING = 'pending',
  SHIPPED = 'shipped',
}

enum PaymentStatusOption {
  PENDING = 'pending',
  PAID = 'paid',
}

enum PriorityOption {
  LOW = 1,
  HIGH = 2,
}

class OrderStatus extends Required(
  class extends EnumType<OrderStatusOption> {
    protected getEnum(): typeof OrderStatusOption {
      return OrderStatusOption;
    }
  },
) {}

class ReturnStatus extends EnumType<OrderStatusOption> {
  protected getEnum(): typeof OrderStatusOption {
    return OrderStatusOption;
  }
}

class PaymentStatus extends EnumType<PaymentStatusOption> {
  protected getEnum(): typeof PaymentStatusOption {
    return PaymentStatusOption;
  }
}

class TicketPriority extends EnumType<PriorityOption> {
  protected getEnum(): typeof PriorityOption {
    return PriorityOption;
  }
}

const blankFormFields: [string, unknown][] = [
  ['a field sent as null', null],
  ['a field left out of the request', undefined],
  ['an empty select', ''],
  ['a select with only spaces', '   '],
];

const unknownStatuses: [string, unknown, string][] = [
  ['the key in capitals', 'PENDING', '"PENDING"'],
  ['a capitalized option', 'Pending', '"Pending"'],
  ['an option with spaces', ' pending ', '" pending "'],
  ['a status that does not exist', 'lost', '"lost"'],
  ['a number', 1, '1'],
  ['a boolean', true, 'true'],
  ['an object', { a: 1 }, '{"a":1}'],
];

const unknownPriorities: [string, unknown, string][] = [
  ['the key name', 'LOW', '"LOW"'],
  ['"3" from a query string, a level that does not exist', '3', '"3"'],
  ['" 1" with spaces from a hand-written URL', ' 1', '" 1"'],
  ['"1e0", a number written in exponent form', '1e0', '"1e0"'],
  ['a level that does not exist', 3, '3'],
  ['zero', 0, '0'],
];

function statusError(received: string): string {
  return `Validation Error: Expected one of [pending, shipped], but received ${received}.`;
}

function priorityError(received: string): string {
  return `Validation Error: Expected one of [1, 2], but received ${received}.`;
}

function thrownBy(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  return undefined;
}

function shippableStatuses() {
  const isShipped = vi.fn((value: unknown) => value === OrderStatusOption.SHIPPED);

  @Validations([{ custom: 'isShipped', fn: isShipped }])
  class DeliveredReturnStatus extends ReturnStatus {}

  @Validations([{ custom: 'isShipped', fn: isShipped }])
  class InvoiceableStatus extends OrderStatus {}

  return { DeliveredReturnStatus, InvoiceableStatus, isShipped };
}

const isShippedError = { custom: 'isShipped', message: 'Value does not satisfy isShipped' };

describe('EnumType', () => {
  describe('an optional return status (string enum)', () => {
    it('is typed as its enum | null, built from an option, null or nothing', () => {
      expectTypeOf<ReturnStatus>().toMatchTypeOf<AbstractType<OrderStatusOption>>();
      expectTypeOf<ConstructorParameters<typeof ReturnStatus>>().toEqualTypeOf<
        [value?: OrderStatusOption | null]
      >();
      expectTypeOf<ReturnStatus['value']>().toEqualTypeOf<OrderStatusOption | null>();
      expectTypeOf<ReturnStatus['validate']>().toEqualTypeOf<
        () => ValidationResult<OrderStatusOption | null>
      >();
    });

    it('cannot be used as a plain option without checking for null', () => {
      // @ts-expect-error an optional value may be null
      const status: OrderStatusOption = new ReturnStatus(OrderStatusOption.PENDING).value;
      expect(status).toBe(OrderStatusOption.PENDING);
    });

    it.each([[OrderStatusOption.PENDING], [OrderStatusOption.SHIPPED]])(
      'keeps the option %o read from the database',
      (option) => {
        expect(new ReturnStatus(option).value).toBe(option);
        expect(new ReturnStatus(option).validate()).toEqual({
          ok: true,
          value: option,
          errors: [],
        });
      },
    );

    it.each(blankFormFields)('stores %s as null, meaning "no return"', (_, input) => {
      expect(new ReturnStatus(input as OrderStatusOption).value).toBeNull();
      expect(new ReturnStatus(input as OrderStatusOption).validate()).toEqual({
        ok: true,
        value: null,
        errors: [],
      });
    });

    it('is null when there is no return', () => {
      expect(new ReturnStatus().value).toBeNull();
    });

    it.each(unknownStatuses)(
      'rejects %s with TypePrimitiveException listing the options',
      (_, input, received) => {
        const create = () => new ReturnStatus(input as OrderStatusOption);
        expect(create).toThrow(TypePrimitiveException);
        expect(create).toThrow(statusError(received));
      },
    );
  });

  describe('a ticket priority (numeric enum)', () => {
    it('is typed as its enum | null', () => {
      expectTypeOf<TicketPriority['value']>().toEqualTypeOf<PriorityOption | null>();
    });

    it.each([[PriorityOption.LOW], [PriorityOption.HIGH]])('keeps the level %o', (option) => {
      expect(new TicketPriority(option).value).toBe(option);
    });

    it.each([
      ['"1" from a query string', '1', PriorityOption.LOW],
      ['"2" from a form select', '2', PriorityOption.HIGH],
    ])('accepts %s as the numeric level', (_, input, expected) => {
      const priority = new TicketPriority(input as unknown as PriorityOption);
      expect(priority.value).toBe(expected);
      expect(priority.equals(new TicketPriority(expected))).toBe(true);
    });

    it.each(unknownPriorities)('rejects %s', (_, input, received) => {
      const create = () => new TicketPriority(input as PriorityOption);
      expect(create).toThrow(TypePrimitiveException);
      expect(create).toThrow(priorityError(received));
    });
  });

  describe('a required order status', () => {
    it('is typed as its enum and built only from an option', () => {
      expectTypeOf<ConstructorParameters<typeof OrderStatus>>().toEqualTypeOf<
        [value: OrderStatusOption]
      >();
      expectTypeOf<OrderStatus['value']>().toEqualTypeOf<OrderStatusOption>();
      expectTypeOf<OrderStatus['validate']>().toEqualTypeOf<
        () => ValidationResult<OrderStatusOption>
      >();
    });

    it('does not compile without a status, but still throws if one sneaks in at runtime', () => {
      // @ts-expect-error a required option needs a value
      expect(() => new OrderStatus()).toThrow(RequiredValueException);
      // @ts-expect-error a required option does not accept null
      expect(() => new OrderStatus(null)).toThrow(RequiredValueException);
      // @ts-expect-error a required option does not accept undefined
      expect(() => new OrderStatus(undefined)).toThrow(RequiredValueException);
      // @ts-expect-error a required option does not accept a plain string
      expect(new OrderStatus('pending').value).toBe(OrderStatusOption.PENDING);
    });

    it.each(blankFormFields)(
      'rejects %s with a RequiredValueException naming the type',
      (_, input) => {
        const received = typeof input === 'string' ? `"${input}"` : 'null';
        const create = () => new OrderStatus(input as OrderStatusOption);
        expect(create).toThrow(RequiredValueException);
        expect(create).toThrow(
          `Validation Error: OrderStatus is required, but received ${received}.`,
        );
      },
    );

    it('rejects a status that does not exist with TypePrimitiveException', () => {
      expect(() => new OrderStatus('lost' as OrderStatusOption)).toThrow(statusError('"lost"'));
    });
  });

  describe('statuses that must be shipped', () => {
    it('an optional return status must be shipped once set', () => {
      const { DeliveredReturnStatus } = shippableStatuses();
      expect(new DeliveredReturnStatus(OrderStatusOption.SHIPPED).validate().ok).toBe(true);
      expect(new DeliveredReturnStatus(OrderStatusOption.PENDING).validate().errors).toEqual([
        isShippedError,
      ]);
    });

    it.each(blankFormFields)(
      'an unset return status (%s) is valid without running the rule',
      (_, input) => {
        const { DeliveredReturnStatus, isShipped } = shippableStatuses();
        expect(new DeliveredReturnStatus(input as OrderStatusOption).validate()).toEqual({
          ok: true,
          value: null,
          errors: [],
        });
        expect(isShipped).not.toHaveBeenCalled();
      },
    );

    it('invoicing a pending order throws ValidationException', () => {
      const { InvoiceableStatus } = shippableStatuses();
      const shipped = new InvoiceableStatus(OrderStatusOption.SHIPPED);
      expect(shipped.assertValid()).toBe(shipped);

      const assertValid = () => new InvoiceableStatus(OrderStatusOption.PENDING).assertValid();
      expect(assertValid).toThrow(ValidationException);
      expect(thrownBy(assertValid)).toMatchObject({
        message: 'Validation failed, InvoiceableStatus: Value does not satisfy isShipped',
        errors: ['InvoiceableStatus: Value does not satisfy isShipped'],
      });
    });

    it('does not make the plain enum type required', () => {
      expect(new ReturnStatus(null).validate()).toEqual({ ok: true, value: null, errors: [] });
    });
  });

  describe('comparing statuses', () => {
    it('two order statuses with the same option are equal', () => {
      expect(
        new OrderStatus(OrderStatusOption.SHIPPED).equals(
          new OrderStatus(OrderStatusOption.SHIPPED),
        ),
      ).toBe(true);
    });

    it('two order statuses with different options are not equal', () => {
      expect(
        new OrderStatus(OrderStatusOption.SHIPPED).equals(
          new OrderStatus(OrderStatusOption.PENDING),
        ),
      ).toBe(false);
    });

    it('a return status and a payment status both "pending" are not equal', () => {
      expect(
        new ReturnStatus(OrderStatusOption.PENDING).equals(
          new PaymentStatus(PaymentStatusOption.PENDING),
        ),
      ).toBe(false);
    });

    it('two unset return statuses are equal', () => {
      expect(new ReturnStatus().equals(new ReturnStatus(null))).toBe(true);
    });
  });

  describe('showing and serializing a status', () => {
    it.each([
      ['a string option', new ReturnStatus(OrderStatusOption.SHIPPED), 'shipped'],
      ['a number option', new TicketPriority(PriorityOption.HIGH), '2'],
      ['an unset status', new ReturnStatus(null), ''],
    ])('toString() of %s gives %o', (_, status, text) => {
      expect(status.toString()).toBe(text);
    });

    it('can be used in a template literal for a notification', () => {
      expect(`Your order is ${new OrderStatus(OrderStatusOption.SHIPPED)}`).toBe(
        'Your order is shipped',
      );
    });

    it('serializes to its plain value inside an API response', () => {
      expect(
        JSON.stringify({
          status: new OrderStatus(OrderStatusOption.PENDING),
          priority: new TicketPriority(PriorityOption.LOW),
          returnStatus: new ReturnStatus(),
        }),
      ).toBe('{"status":"pending","priority":1,"returnStatus":null}');
    });
  });
});
