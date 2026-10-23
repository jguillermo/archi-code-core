'use strict';

const ORDER_ID = '9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c';

function throwsInstanceOf(create, ExceptionClass) {
  try {
    create();
  } catch (e) {
    return e instanceof ExceptionClass;
  }
  return false;
}

function smoke(m) {
  return [
    ['StringType converts', () => new m.StringType(12).value === '12'],
    ['StringType keeps blank text as written', () => new m.StringType('  ').value === '  '],
    [
      'Required throws RequiredValueException',
      () => {
        class Name extends m.Required(m.StringType) {}
        return throwsInstanceOf(() => new Name(null), m.RequiredValueException);
      },
    ],
    [
      'NumberType rejects text',
      () => throwsInstanceOf(() => new m.NumberType('abc'), m.TypePrimitiveException),
    ],
    [
      'DateType reads ISO and rejects a time without zone',
      () =>
        new m.DateType('2018-03-23').toString() === '2018-03-23T00:00:00.000Z' &&
        throwsInstanceOf(() => new m.DateType('2018-03-23T10:00:00'), m.TypePrimitiveException),
    ],
    [
      'IdType is required and lowercase',
      () =>
        throwsInstanceOf(() => new m.IdType(null), m.RequiredValueException) &&
        new m.IdType(ORDER_ID.toUpperCase()).value === ORDER_ID,
    ],
    [
      'value objects print and compare by value',
      () => {
        class City extends m.StringType {}
        const city = new City('Huelva');
        return (
          'DomainException' in m &&
          !('AbstractException' in m) &&
          `${city}` === 'Huelva' &&
          city.equals(new City('Huelva')) &&
          !city.equals(new m.StringType('Huelva'))
        );
      },
    ],
    [
      'ArrayType returns new instances and finds dates by value',
      () => {
        class Holidays extends m.ArrayType {
          createItem(value) {
            return new m.DateType(value);
          }
        }
        const holidays = new Holidays(['2026-01-01']);
        const fewer = holidays.withoutItem('2026-01-01');
        return holidays.hasItem('2026-01-01') && fewer.value.length === 0 && fewer !== holidays;
      },
    ],
    ['validate checks a value object again', () => new m.StringType('abc').validate().ok === true],
    [
      'Composite builds, compares and rebuilds a value object of several fields',
      () => {
        class Cents extends m.Required(m.NumberType) {}
        class Currency extends m.Required(m.StringType) {}
        class Money extends m.Composite({ amount: Cents, currency: Currency }) {}
        class Cart extends m.Composite({ prices: [Money] }) {}
        const cart = Cart.fromPrimitives({ prices: [{ amount: 1250, currency: 'EUR' }] });
        let fields = [];
        try {
          Cart.fromPrimitives({ prices: [{ amount: 'x', currency: null }] });
        } catch (error) {
          fields = error.errors.map((issue) => issue.field);
        }
        return (
          (cart.prices[0] instanceof Money &&
            cart.equals(Cart.fromPrimitives(cart.toPrimitives())) &&
            JSON.stringify(cart.toPrimitives()) ===
              '{"prices":[{"amount":1250,"currency":"EUR"}]}' &&
            fields.join(',') === 'prices.0.amount,prices.0.currency') ||
          `unexpected composite behavior ${fields.join(',')}`
        );
      },
    ],
    [
      'Entity compares by id and is the base of aggregate roots',
      () => {
        class Seat extends m.Entity {}
        class Room extends m.AggregateRoot {}
        const seat = new Seat(new m.IdType(ORDER_ID));
        const refusesEmptyId = () => {
          try {
            new Seat(new m.StringType(null));
            return false;
          } catch (error) {
            return error instanceof m.RequiredValueException;
          }
        };
        return (
          (seat.equals(new Seat(new m.IdType(ORDER_ID.toUpperCase()))) &&
            !seat.equals(new Room(new m.IdType(ORDER_ID))) &&
            new Room(new m.IdType(ORDER_ID)) instanceof m.Entity &&
            refusesEmptyId()) ||
          'unexpected entity equality'
        );
      },
    ],
    [
      'Specification combines named rules',
      () => {
        class Above extends m.Specification {
          constructor(limit) {
            super();
            this.limit = limit;
          }
          isSatisfiedBy(value) {
            return value > this.limit;
          }
        }
        const between = new Above(10).and(new Above(20).not());
        return (
          (between.isSatisfiedBy(15) &&
            !between.isSatisfiedBy(25) &&
            new Above(10).or(new Above(0)).isSatisfiedBy(5)) ||
          'unexpected specification result'
        );
      },
    ],
    [
      'aggregate records events with metadata',
      () => {
        class OrderPlaced extends m.EventBase {
          static eventName = 'OrderPlaced';

          constructor(orderId) {
            super();
            this.orderId = orderId;
          }
        }
        class Order extends m.AggregateRoot {
          static place(id) {
            const order = new Order(new m.IdType(id));
            order.record(new OrderPlaced(id));
            return order;
          }
        }
        const order = Order.place(ORDER_ID);
        const [event] = order.pullDomainEvents();
        const json = JSON.parse(JSON.stringify(event));
        return (
          json.eventName === 'OrderPlaced' &&
          json.orderId === ORDER_ID &&
          typeof json.eventId === 'string' &&
          order.pullDomainEvents().length === 0
        );
      },
    ],
    [
      'domain exceptions carry their codes, and a custom one keeps its layer and code',
      () => {
        class OrderShippedException extends m.DomainException {
          constructor(id) {
            super(`Order ${id} is already shipped`, ['ORD001']);
          }
        }
        const shipped = new OrderShippedException(ORDER_ID);
        const invalid = new m.ValidationException([{ field: 'email', message: 'Email: invalid' }]);
        return (
          (shipped.code === 'ORD001' &&
            shipped instanceof m.DomainException &&
            shipped.description === 'Domain Exception (DOM000), OrderShippedException (ORD001)' &&
            invalid.code === m.DomainExceptionCode.ValidationFailed &&
            invalid.errors[0].code === 'DOM001' &&
            invalid instanceof m.DomainException &&
            JSON.parse(JSON.stringify(invalid)).code === 'DOM001') ||
          'unexpected domain exception shape'
        );
      },
    ],
    [
      'an event class without a static eventName throws InvalidEventDefinitionException',
      () => {
        class OrderArchived extends m.EventBase {}
        try {
          new OrderArchived();
        } catch (error) {
          return (
            (error instanceof m.InvalidEventDefinitionException &&
              error.code === 'DOM005' &&
              error.message === 'OrderArchived must declare a static eventName') ||
            `unexpected ${error}`
          );
        }
        return 'no exception';
      },
    ],
  ];
}

function crossBuild(cjs, esm) {
  return [
    [
      'share the required mark',
      () => {
        class RequiredAcrossBuilds extends esm.Required(cjs.StringType) {}
        return throwsInstanceOf(() => new RequiredAcrossBuilds(null), cjs.RequiredValueException);
      },
    ],
    [
      'recognize domain exceptions thrown by the other build',
      () => {
        const invalid = new cjs.ValidationException([
          { field: 'email', message: 'Email: Value does not satisfy isEmail' },
        ]);
        const malformed = new esm.TypePrimitiveException('Number', 'abc');
        return (
          (invalid instanceof esm.ValidationException &&
            invalid instanceof esm.DomainException &&
            !(invalid instanceof esm.TypePrimitiveException) &&
            malformed instanceof cjs.TypePrimitiveException &&
            malformed instanceof cjs.DomainException) ||
          'a domain exception of one build is not recognized by the other'
        );
      },
    ],
  ];
}

module.exports = { smoke, crossBuild };
