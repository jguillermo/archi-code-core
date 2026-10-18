'use strict';

const path = require('path');

const domain = require(path.resolve(__dirname, '../../dist/cjs/domain/index.js'));
const exceptions = require(path.resolve(__dirname, '../../dist/cjs/exceptions/index.js'));

const ORDER_ID = '9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c';

function orderModel() {
  class OrderPlaced extends domain.EventBase {
    eventName() {
      return 'order.placed';
    }
  }
  class Order extends domain.AggregateRoot {
    static place(id) {
      const order = new Order(new domain.IdType(id));
      order.record(new OrderPlaced(id));
      return order;
    }
  }
  return { Order };
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
          delete: async () => undefined,
        };
        const bus = {
          publish: async (events) => {
            published.push(...events.map((event) => event.eventName()));
          },
        };
        class PlaceOrder extends m.UseCase {
          async handle(input) {
            const order = Order.place(input.id);
            await repository.save(order);
            await bus.publish(order.pullDomainEvents());
            return order.id.value;
          }
        }
        const id = await new PlaceOrder().execute({ id: ORDER_ID });
        return (
          (id === ORDER_ID && saved[0] === ORDER_ID && published[0] === 'order.placed') ||
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
          delete: async () => {},
        };
        class ShipOrder extends m.UseCase {
          async handle(input) {
            const order = await repository.findById(new domain.IdType(input.id));
            if (order === null) {
              throw new exceptions.AggregateNotFoundException('Order', input.id);
            }
            return order;
          }
        }
        class Broken extends m.UseCase {
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
  ];
}

module.exports = { smoke };
