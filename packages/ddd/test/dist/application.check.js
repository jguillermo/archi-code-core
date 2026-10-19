'use strict';

const path = require('path');

const domain = require(path.resolve(__dirname, '../../dist/cjs/domain/index.js'));
const exceptions = require(path.resolve(__dirname, '../../dist/cjs/exceptions/index.js'));

const ORDER_ID = '9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c';

function orderModel() {
  class OrderPlaced extends domain.EventBase {
    static eventName = 'OrderPlaced';
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
            published.push(...events.map((event) => event.eventName()));
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
              throw new exceptions.AggregateNotFoundException('Order', id.value);
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
          (missing instanceof exceptions.AggregateNotFoundException &&
            broken instanceof exceptions.InternalErrorException &&
            broken.message === 'Failed, internal error: Broken: connection reset') ||
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
            received.push(event.aggregateId);
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
  ];
}

module.exports = { smoke };
