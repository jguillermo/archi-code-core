'use strict';

const path = require('path');

const domain = require(path.resolve(__dirname, '../../dist/cjs/domain/index.js'));

const ORDER_ID = '9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c';

function orderModel() {
  class OrderPlaced extends domain.EventBase {
    static eventName = 'OrderPlaced';

    constructor(orderId) {
      super();
      this.orderId = orderId;
    }
  }
  class Order extends domain.AggregateRoot {
    static place(id) {
      const order = new Order(new domain.IdType(id));
      order.record(new OrderPlaced(id));
      return order;
    }
  }
  return { Order, OrderPlaced };
}

function smoke(m) {
  return [
    [
      'a use case saves the aggregate and publishes its events',
      async () => {
        const { Order } = orderModel();
        const saved = [];
        const published = [];
        const repository = {
          findById: async () => null,
          save: async (order) => {
            saved.push(order.id.value);
          },
          remove: async () => undefined,
        };
        const bus = {
          publish: async (events) => {
            published.push(...events.map((event) => event.eventName));
          },
        };
        class PlaceOrder extends m.UseCase {
          toCommand(input) {
            return new domain.IdType(input.id);
          }

          async handle(id) {
            const order = Order.place(id.value);
            await repository.save(order);
            await bus.publish(order.pullDomainEvents());
            return order.id.value;
          }
        }
        const id = await new PlaceOrder().execute({ id: ORDER_ID });
        return (
          (id === ORDER_ID && saved[0] === ORDER_ID && published[0] === 'OrderPlaced') ||
          `unexpected ${JSON.stringify({ id, saved, published })}`
        );
      },
    ],
    [
      'a use case lets package exceptions through and wraps unknown errors',
      async () => {
        const repository = {
          findById: async () => null,
          save: async () => {},
          remove: async () => {},
        };
        class ShipOrder extends m.UseCase {
          toCommand(input) {
            return new domain.IdType(input.id);
          }

          async handle(id) {
            const order = await repository.findById(id);
            if (order === null) {
              throw new m.AggregateNotFoundException('Order', id.value);
            }
            return order;
          }
        }
        class Broken extends m.UseCase {
          toCommand(input) {
            return input;
          }

          async handle() {
            throw new Error('connection reset');
          }
        }
        const missing = await new ShipOrder().execute({ id: ORDER_ID }).catch((error) => error);
        const broken = await new Broken().execute({}).catch((error) => error);
        return (
          (missing instanceof m.AggregateNotFoundException &&
            broken instanceof m.UnexpectedErrorException &&
            broken.message === 'Failed, unexpected error: Broken: connection reset') ||
          `unexpected ${missing} / ${broken}`
        );
      },
    ],
    [
      'a listener marked with ListensTo is read back by its event and consumer names',
      async () => {
        const { OrderPlaced } = orderModel();
        const received = [];
        class ConfirmOrderOnOrderPlaced extends m.EventListener {
          handle(event) {
            received.push(event.orderId);
          }
        }
        m.ListensTo(OrderPlaced, { consumer: 'confirm-order' })(ConfirmOrderOnOrderPlaced);
        const listener = new ConfirmOrderOnOrderPlaced();
        await listener.handle(new OrderPlaced(ORDER_ID));
        return (
          (m.ListensTo.subscriptionOf(listener).eventName === 'OrderPlaced' &&
            m.ListensTo.subscriptionOf(listener).consumer === 'confirm-order' &&
            received[0] === ORDER_ID) ||
          `unexpected ${m.ListensTo.subscriptionOf(listener).eventName} / ${received}`
        );
      },
    ],
    [
      'ValueObjectBuilder.build reports every invalid field at once',
      () => {
        class OrderId extends domain.IdType {}
        class Customer extends domain.Required(domain.StringType) {}
        const built = m.ValueObjectBuilder.build({
          orderId: () => new OrderId(ORDER_ID),
          customer: () => new Customer('Ana'),
        });
        let issues = [];
        try {
          m.ValueObjectBuilder.build({
            orderId: () => new OrderId('not-an-id'),
            customer: () => new Customer(null),
          });
        } catch (error) {
          issues = error.errors.map((issue) => issue.field);
        }
        return (
          (built.orderId.value === ORDER_ID &&
            built.customer.value === 'Ana' &&
            issues.join(',') === 'orderId,customer') ||
          `unexpected fields ${issues.join(',')}`
        );
      },
    ],
    [
      'application exceptions carry their codes, description and cause',
      () => {
        const cause = new Error('connection reset');
        const unexpected = new m.UnexpectedErrorException('PlaceOrder: saving order', { cause });
        const notFound = new m.AggregateNotFoundException('Order', ORDER_ID);
        return (
          (unexpected.cause === cause &&
            unexpected.code === m.ApplicationExceptionCode.UnexpectedError &&
            notFound.code === 'APP002' &&
            notFound.description ===
              'Application Exception (APP000), Aggregate Not Found (APP002)' &&
            notFound instanceof m.ApplicationException &&
            !(notFound instanceof domain.DomainException) &&
            new m.NotAllowedException('cus-luis cannot cancel').code === 'APP003' &&
            new m.ConcurrencyException('Order', ORDER_ID, 3).code === 'APP001' &&
            JSON.parse(JSON.stringify(notFound)).message ===
              `Order with ID ${ORDER_ID} not found.`) ||
          'unexpected application exception shape'
        );
      },
    ],
  ];
}

function crossBuild(cjs, esm) {
  return [
    [
      'recognize application exceptions thrown by the other build',
      () => {
        const notFound = new esm.AggregateNotFoundException('Order', ORDER_ID);
        const conflict = new cjs.ConcurrencyException('Order', ORDER_ID, 3);
        return (
          (notFound instanceof cjs.AggregateNotFoundException &&
            notFound instanceof cjs.ApplicationException &&
            !(notFound instanceof cjs.ConcurrencyException) &&
            conflict instanceof esm.ConcurrencyException &&
            conflict instanceof esm.ApplicationException) ||
          'an application exception of one build is not recognized by the other'
        );
      },
    ],
  ];
}

async function applicationInThePage(entry) {
  const m = await import(entry);
  const pageDomain = await import(new URL('../domain/index.js', entry).href);
  const failures = [];
  const expect = (name, passed) => {
    if (!passed) failures.push(name);
  };

  class OrderId extends pageDomain.IdType {}
  class CustomerName extends pageDomain.Required(pageDomain.StringType) {}
  class OrderPlaced extends pageDomain.EventBase {
    static eventName = 'OrderPlaced';

    constructor(orderId) {
      super();
      this.orderId = orderId;
    }
  }
  class Order extends pageDomain.AggregateRoot {
    static place(id) {
      const order = new Order(id);
      order.record(new OrderPlaced(id.value));
      return order;
    }
  }

  const saved = [];
  const published = [];
  class PlaceOrder extends m.UseCase {
    toCommand(input) {
      return m.ValueObjectBuilder.build({
        orderId: () => new OrderId(input.orderId),
        customer: () => new CustomerName(input.customer),
      });
    }

    async handle(command) {
      const order = Order.place(command.orderId);
      saved.push(order.id.value);
      published.push(...order.pullDomainEvents().map((event) => event.eventName));
      return order.id.value;
    }
  }
  const orderId = pageDomain.UuidType.random();
  const placed = await new PlaceOrder().execute({ orderId, customer: 'Ana' });
  expect(
    'a use case saves and publishes',
    placed === orderId && saved[0] === orderId && published[0] === 'OrderPlaced',
  );

  const invalid = await new PlaceOrder()
    .execute({ orderId: 'not-an-id', customer: null })
    .catch((error) => error);
  expect(
    'ValueObjectBuilder reports every field',
    invalid instanceof pageDomain.ValidationException &&
      invalid.errors.map((issue) => issue.field).join() === 'orderId,customer',
  );

  class Broken extends m.UseCase {
    toCommand(input) {
      return input;
    }

    async handle() {
      throw new Error('network down');
    }
  }
  const unexpected = await new Broken().execute({}).catch((error) => error);
  expect(
    'unknown errors are wrapped with their cause',
    unexpected instanceof m.UnexpectedErrorException && unexpected.cause.message === 'network down',
  );

  class ConfirmOrderOnOrderPlaced extends m.EventListener {
    handle() {}
  }
  m.ListensTo(OrderPlaced, { consumer: 'confirm-order' })(ConfirmOrderOnOrderPlaced);
  const subscription = m.ListensTo.subscriptionOf(new ConfirmOrderOnOrderPlaced());
  expect(
    'ListensTo keeps the event and consumer',
    subscription.eventName === 'OrderPlaced' && subscription.consumer === 'confirm-order',
  );

  return failures.length === 0 || failures.join('; ');
}

function browser() {
  return [['runs use cases, the builder and listeners', applicationInThePage]];
}

module.exports = { smoke, crossBuild, browser };
