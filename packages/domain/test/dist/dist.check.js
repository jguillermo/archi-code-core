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
    ['StringType keeps blanks as null', () => new m.StringType('  ').value === null],
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
      'value objects print, serialize and compare by value',
      () => {
        class City extends m.StringType {}
        const city = new City('Huelva');
        return (
          `${city}` === 'Huelva' &&
          JSON.stringify({ city }) === '{"city":"Huelva"}' &&
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
      'validate and assertValid',
      () => {
        const result = new m.StringType('abc').validate();
        return (
          result.ok === true &&
          result.value === 'abc' &&
          result.errors.length === 0 &&
          new m.StringType('abc').assertValid().value === 'abc'
        );
      },
    ],
    [
      'aggregate records events with metadata',
      () => {
        class OrderPlaced extends m.EventBase {
          eventName() {
            return 'order.placed';
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
          order.version === 0 &&
          json.eventName === 'order.placed' &&
          json.aggregateId === ORDER_ID &&
          typeof json.eventId === 'string' &&
          order.pullDomainEvents().length === 0
        );
      },
    ],
    [
      'exceptions keep their cause',
      () => {
        const cause = new Error('connection reset');
        return new m.InternalErrorException('saving order', { cause }).cause === cause;
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
      'recognize exceptions thrown by the other build',
      () => {
        const notFound = new esm.AggregateNotFoundException('Order', ORDER_ID);
        const invalid = new cjs.ValidationException(['Email: Value does not satisfy isEmail']);
        return (
          notFound instanceof cjs.AggregateNotFoundException &&
          notFound instanceof cjs.DomainException &&
          notFound instanceof cjs.AbstractException &&
          !(notFound instanceof cjs.ValidationException) &&
          !(notFound instanceof cjs.InfrastructureException) &&
          invalid instanceof esm.ValidationException &&
          invalid instanceof esm.DomainException
        );
      },
    ],
  ];
}

module.exports = { smoke, crossBuild };
