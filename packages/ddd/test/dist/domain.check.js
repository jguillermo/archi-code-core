'use strict';

const path = require('path');

const exceptions = require(path.resolve(__dirname, '../../dist/cjs/exceptions/index.js'));

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
    ['StringType keeps blanks as null', () => new m.StringType('  ').value === null],
    [
      'Required throws RequiredValueException',
      () => {
        class Name extends m.Required(m.StringType) {}
        return throwsInstanceOf(() => new Name(null), exceptions.RequiredValueException);
      },
    ],
    [
      'NumberType rejects text',
      () => throwsInstanceOf(() => new m.NumberType('abc'), exceptions.TypePrimitiveException),
    ],
    [
      'DateType reads ISO and rejects a time without zone',
      () =>
        new m.DateType('2018-03-23').toString() === '2018-03-23T00:00:00.000Z' &&
        throwsInstanceOf(
          () => new m.DateType('2018-03-23T10:00:00'),
          exceptions.TypePrimitiveException,
        ),
    ],
    [
      'IdType is required and lowercase',
      () =>
        throwsInstanceOf(() => new m.IdType(null), exceptions.RequiredValueException) &&
        new m.IdType(ORDER_ID.toUpperCase()).value === ORDER_ID,
    ],
    [
      'value objects print and compare by value',
      () => {
        class City extends m.StringType {}
        const city = new City('Huelva');
        return (
          !('DomainException' in m) &&
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
    [
      'validate, and ValueObjects.build reports every invalid field at once',
      () => {
        class OrderId extends m.IdType {}
        class Customer extends m.Required(m.StringType) {}
        const result = new m.StringType('abc').validate();
        const built = m.ValueObjects.build({
          orderId: () => new OrderId(ORDER_ID),
          customer: () => new Customer('Ana'),
        });
        let issues = [];
        try {
          m.ValueObjects.build({
            orderId: () => new OrderId('not-an-id'),
            customer: () => new Customer(''),
          });
        } catch (error) {
          issues = error.errors.map((issue) => issue.field);
        }
        return (
          (result.ok === true &&
            built.orderId.value === ORDER_ID &&
            built.customer.value === 'Ana' &&
            issues.join(',') === 'orderId,customer') ||
          `unexpected fields ${issues.join(',')}`
        );
      },
    ],
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
          Cart.fromPrimitives({ prices: [{ amount: 'x', currency: '' }] });
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
            return error instanceof exceptions.RequiredValueException;
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
  ];
}

function crossBuild(cjs, esm) {
  return [
    [
      'share the required mark',
      () => {
        class RequiredAcrossBuilds extends esm.Required(cjs.StringType) {}
        return throwsInstanceOf(
          () => new RequiredAcrossBuilds(null),
          exceptions.RequiredValueException,
        );
      },
    ],
  ];
}

module.exports = { smoke, crossBuild };
