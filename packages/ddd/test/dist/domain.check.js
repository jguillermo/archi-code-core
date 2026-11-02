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

function criteriaValueObjects(m) {
  class UserName extends m.StringType {}
  class UserAge extends m.NumberType {}
  class UserStatus extends m.StringType {}
  return { UserName, UserAge, UserStatus };
}

function criteriaChecks(m) {
  return [
    [
      'Criteria reads value objects and survives the URL round trip',
      () => {
        const { UserName, UserStatus } = criteriaValueObjects(m);
        const criteria = m.Criteria.create({
          where: {
            status: new UserStatus('active'),
            createdAt: { gt: new m.CreatedAt(new Date(0)) },
            name: new UserName(null),
          },
          orderBy: { name: 'asc' },
          limit: 10,
        });
        const restored = m.Criteria.fromUrl(criteria.toUrl());
        let code = null;
        try {
          m.Criteria.create({ where: { status: 'active' } });
        } catch (error) {
          code = error instanceof m.CriteriaError ? error.code : 'OTHER';
        }
        return (
          (/^[A-Za-z0-9_-]+$/.test(criteria.toUrl()) &&
            restored.equals(criteria) &&
            restored.filter.filters[0].value === 'active' &&
            m.isDate(restored.filter.filters[1].value) &&
            restored.filter.filters[2].kind === 'isNull' &&
            code === 'INVALID_VALUE') ||
          `unexpected criteria ${JSON.stringify(restored)} ${code}`
        );
      },
    ],
    [
      'defineCriteriaSchema converts input through value objects and rejects unknown fields',
      () => {
        const { UserAge } = criteriaValueObjects(m);
        const schema = m.defineCriteriaSchema({ fields: { age: UserAge }, maxLimit: 50 });
        const criteria = schema.parse({ where: { age: { gte: '18' } } });
        let code = null;
        try {
          schema.parse({ where: { password: 'x' } });
        } catch (error) {
          code = error instanceof m.CriteriaError ? error.code : 'OTHER';
        }
        return (
          (criteria.filter.value === 18 &&
            criteria.pagination.limit === 50 &&
            code === 'UNKNOWN_FIELD') ||
          `unexpected schema result ${JSON.stringify(criteria)} ${code}`
        );
      },
    ],
    [
      'Criteria.fromUrl rejects deep nesting with a CriteriaError',
      () => {
        const levels = 5000;
        const json = `{"v":1,"f":${'["not",'.repeat(levels)}["eq","id","x"]${']'.repeat(levels)}}`;
        const text = btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        try {
          m.Criteria.fromJSON(JSON.parse(json));
          return 'deep JSON was accepted';
        } catch (error) {
          if (!(error instanceof m.CriteriaError) || error.code !== 'LIMIT_EXCEEDED') {
            return `unexpected error ${error}`;
          }
        }
        try {
          m.Criteria.fromUrl(text);
          return 'long URL text was accepted';
        } catch (error) {
          return (
            (error instanceof m.CriteriaError && error.code === 'LIMIT_EXCEEDED') || `${error}`
          );
        }
      },
    ],
  ];
}

function smoke(m) {
  return [
    ...criteriaChecks(m),
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
      'AggregateRepository is the base an abstract repository of orders extends',
      async () => {
        class Order extends m.AggregateRoot {}
        class OrderRepository extends m.AggregateRepository {}
        class InMemoryOrderRepository extends OrderRepository {
          constructor() {
            super();
            this.orders = new Map();
          }
          async findById(id) {
            return this.orders.get(id.value) ?? null;
          }
          async save(order) {
            this.orders.set(order.id.value, order);
          }
        }
        const repository = new InMemoryOrderRepository();
        const order = new Order(new m.IdType(ORDER_ID));
        await repository.save(order);
        return (
          ((await repository.findById(new m.IdType(ORDER_ID))) === order &&
            repository instanceof m.AggregateRepository &&
            Object.getOwnPropertyNames(m.AggregateRepository.prototype).length === 1) ||
          'unexpected repository base'
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
      'CriteriaError from one build is an instance of the other',
      () =>
        (new esm.CriteriaError('INVALID_FIELD', 'x') instanceof cjs.CriteriaError &&
          new cjs.CriteriaError('INVALID_FIELD', 'x') instanceof esm.CriteriaError &&
          !(new Error('x') instanceof cjs.CriteriaError)) ||
        'CriteriaError is not recognized across builds',
    ],
    [
      'a criteria of one build reads the value objects and schema classes of the other',
      () => {
        class UserAge extends cjs.NumberType {}
        const criteria = esm.Criteria.create({ where: { age: { gte: new UserAge(18) } } });
        const schema = esm.defineCriteriaSchema({ fields: { age: UserAge }, maxLimit: 5 });
        return (
          (criteria.filter.value === 18 &&
            schema.parse({ where: { age: '20' } }).filter.value === 20) ||
          `unexpected ${JSON.stringify(criteria.filter)}`
        );
      },
    ],
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

const STRICT_CSP = "default-src 'self'; script-src 'self'";

async function domainInThePage(entry) {
  const m = await import(entry);
  const failures = [];
  const expect = (name, passed) => {
    if (!passed) failures.push(name);
  };
  const thrown = (create) => {
    try {
      create();
    } catch (error) {
      return error;
    }
    return null;
  };

  class CustomerName extends m.Required(m.StringType) {}
  expect(
    'Required refuses null',
    thrown(() => new CustomerName(null)) instanceof m.RequiredValueException,
  );
  expect('StringType converts', new m.StringType(12).value === '12');

  const placedOn = new m.DateType('2026-10-19T09:30:00+02:00');
  expect('DateType reads a zone', placedOn.toString() === '2026-10-19T07:30:00.000Z');
  expect(
    'DateType is immutable',
    thrown(() => placedOn.value.setFullYear(2000)) instanceof TypeError,
  );
  expect(
    'DateType refuses a time without zone',
    thrown(() => new m.DateType('2026-10-19T09:30:00')) instanceof m.TypePrimitiveException,
  );

  class OrderId extends m.IdType {}
  const generated = OrderId.generate();
  expect(
    'IdType.generate gives a UUID v4',
    /^[0-9a-f-]{36}$/.test(generated.value) && generated.value[14] === '4',
  );
  expect(
    'UuidType.fromValue is deterministic',
    m.UuidType.fromValue('order') === m.UuidType.fromValue('order'),
  );

  class Cents extends m.Required(m.NumberType) {}
  class Currency extends m.Required(m.StringType) {}
  class Money extends m.Composite({ amount: Cents, currency: Currency }) {}
  const price = Money.fromPrimitives({ amount: 1250, currency: 'EUR' });
  const invalid = thrown(() => Money.fromPrimitives({ amount: 'x', currency: null }));
  expect('Composite round-trips', price.equals(Money.fromPrimitives(price.toPrimitives())));
  expect(
    'Composite reports every field',
    invalid instanceof m.ValidationException &&
      invalid.errors.map((issue) => issue.field).join() === 'amount,currency',
  );

  class OrderPlaced extends m.EventBase {
    static eventName = 'OrderPlaced';

    constructor(orderId) {
      super();
      this.orderId = orderId;
    }
  }
  class Order extends m.AggregateRoot {
    static place(id) {
      const order = new Order(id);
      order.record(new OrderPlaced(id.value));
      return order;
    }
  }
  const order = Order.place(generated);
  const [event] = order.pullDomainEvents();
  const json = JSON.parse(JSON.stringify(event));
  expect(
    'aggregate records serializable events',
    json.eventName === 'OrderPlaced' &&
      json.orderId === generated.value &&
      /^[0-9a-f-]{36}$/.test(json.eventId) &&
      !('occurredOn' in json) &&
      order.pullDomainEvents().length === 0,
  );

  class Above extends m.Specification {
    constructor(limit) {
      super();
      this.limit = limit;
    }

    isSatisfiedBy(value) {
      return value > this.limit;
    }
  }
  expect('Specification combines rules', new Above(10).and(new Above(20).not()).isSatisfiedBy(15));

  return failures.length === 0 || failures.join('; ');
}

async function criteriaInThePage(entry) {
  const m = await import(entry);
  class UserId extends m.IdType {}
  class UserName extends m.StringType {}
  const schema = m.defineCriteriaSchema({
    fields: { id: UserId, name: UserName, createdAt: m.CreatedAt },
    maxLimit: 20,
    tiebreaker: 'id',
  });
  const criteria = schema.parse({
    where: { name: { contains: '\u03A9', mode: 'insensitive' }, createdAt: { gte: '2024-01-01' } },
    orderBy: { name: 'desc' },
  });
  const restored = schema.fromUrl(criteria.toUrl());
  if (!restored.equals(criteria)) return `round trip ${JSON.stringify(restored.toJSON())}`;
  if (restored.order[1].field !== 'id') return `order ${JSON.stringify(restored.order)}`;
  const date = restored.filter.filters[1].value;
  if (!(date instanceof Date) || date.toISOString() !== '2024-01-01T00:00:00.000Z') {
    return `date ${String(date)}`;
  }
  try {
    date.setTime(0);
    return 'a criteria date changed';
  } catch (error) {
    if (!(error instanceof TypeError)) return `setTime threw ${error}`;
  }
  if (m.compareText('\uFF71', '\u{1F600}') !== -1) return 'text is not in code point order';
  return true;
}

function nodeCriteriaText(m) {
  class UserName extends m.StringType {}
  return m.Criteria.create({
    where: {
      name: { startsWith: 'Ana' },
      createdAt: { gte: new m.CreatedAt(new Date(0)) },
      age: { in: [new UserName('a'), new UserName('b')] },
    },
    orderBy: { name: 'asc' },
    limit: 5,
  }).toUrl();
}

function browser() {
  return [
    ['runs the domain building blocks under a strict CSP', domainInThePage, { csp: STRICT_CSP }],
    [
      'builds, sends, reads and checks criteria under a strict CSP',
      criteriaInThePage,
      { csp: STRICT_CSP },
    ],
    [
      'builds the same criteria URL text as Node and reads the text Node builds',
      async ({ entry, input }) => {
        const m = await import(entry);
        class UserName extends m.StringType {}
        const criteria = m.Criteria.create({
          where: {
            name: { startsWith: 'Ana' },
            createdAt: { gte: new m.CreatedAt(new Date(0)) },
            age: { in: [new UserName('a'), new UserName('b')] },
          },
          orderBy: { name: 'asc' },
          limit: 5,
        });
        return {
          text: criteria.toUrl(),
          readsNodeText: m.Criteria.fromUrl(input.nodeText).equals(criteria),
        };
      },
      {
        input: () => ({ nodeText: nodeCriteriaText(require('../../dist/cjs/domain/index.js')) }),
        verify: (result, input) =>
          (result.text === input.nodeText && result.readsNodeText) ||
          `web ${result.text} differs from Node ${input.nodeText}`,
      },
    ],
  ];
}

module.exports = { smoke, crossBuild, browser };
