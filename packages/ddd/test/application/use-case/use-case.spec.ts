import { describe, expect, expectTypeOf, it } from 'vitest';
import { Validations } from '@archi-code/validation';
import { UseCase } from '../../../src/application/use-case/use-case';
import type { EventBus } from '../../../src/application/ports/event-bus';
import {
  AggregateRoot,
  BooleanType,
  EventBase,
  IdType,
  Required,
  StringType,
  ValueObjects,
} from '../../../src/domain/index';
import {
  AggregateNotFoundException,
  ApplicationException,
  DomainException,
  InternalErrorException,
  ValidationException,
} from '../../../src/exceptions/index';
import type {
  AggregateFinder,
  AggregateRemover,
  AggregateSaver,
  PrimitiveTypes,
} from '../../../src/domain/index';

class OrderId extends IdType {}

@Validations([{ validator: 'isLength', properties: { min: 2 } }])
class CustomerName extends Required(StringType) {}

class Shipped extends Required(BooleanType) {}

class OrderPlaced extends EventBase {
  static readonly eventName = 'OrderPlaced';

  constructor(
    orderId: string,
    readonly customer: string,
  ) {
    super(orderId);
  }
}

class OrderShipped extends EventBase {
  static readonly eventName = 'OrderShipped';
}

type OrderEvent = OrderPlaced | OrderShipped;

class OrderAlreadyShippedException extends DomainException {
  constructor(orderId: string) {
    super(`Order ${orderId} is already shipped`, ['ORD001']);
  }
}

class Order extends AggregateRoot<OrderId, OrderEvent> {
  private constructor(
    id: OrderId,
    readonly customer: CustomerName,
    private _shipped: Shipped,
  ) {
    super(id);
  }

  static place(id: OrderId, customer: CustomerName): Order {
    const order = new Order(id, customer, new Shipped(false));
    order.record(new OrderPlaced(id.value, customer.value));
    return order;
  }

  static fromPrimitives(row: PrimitiveTypes<Order>): Order {
    return new Order(new OrderId(row.id), new CustomerName(row.customer), new Shipped(row.shipped));
  }

  get shipped(): Shipped {
    return this._shipped;
  }

  ship(): void {
    if (this._shipped.value) {
      throw new OrderAlreadyShippedException(this.id.value);
    }
    this._shipped = new Shipped(true);
    this.record(new OrderShipped(this.id.value));
  }

  toPrimitives(): PrimitiveTypes<Order> {
    return {
      id: this.id.value,
      customer: this.customer.value,
      shipped: this.shipped.value,
    };
  }
}

class FakeOrderRepository
  implements AggregateFinder<Order>, AggregateSaver<Order>, AggregateRemover<Order>
{
  readonly rows = new Map<string, PrimitiveTypes<Order>>();
  readonly log: string[];
  failWith: unknown = undefined;

  constructor(log: string[] = []) {
    this.log = log;
  }

  async findById(id: OrderId): Promise<Order | null> {
    if (this.failWith !== undefined) {
      throw this.failWith;
    }
    const row = this.rows.get(id.value);
    return row === undefined ? null : Order.fromPrimitives(row);
  }

  async save(order: Order): Promise<void> {
    if (this.failWith !== undefined) {
      throw this.failWith;
    }
    this.log.push(`save ${order.id.value}`);
    this.rows.set(order.id.value, order.toPrimitives());
  }

  async remove(id: OrderId): Promise<void> {
    this.rows.delete(id.value);
  }
}

class FakeEventBus implements EventBus<OrderEvent> {
  readonly published: OrderEvent[] = [];

  constructor(private readonly log: string[] = []) {}

  async publish(events: readonly OrderEvent[]): Promise<void> {
    this.log.push(`publish ${events.map((event) => event.eventName()).join(',')}`);
    this.published.push(...events);
  }
}

interface PlaceOrderInput {
  orderId: string;
  customer: string;
}

interface PlaceOrderCommand {
  orderId: OrderId;
  customer: CustomerName;
}

class PlaceOrder extends UseCase<PlaceOrderInput, PlaceOrderCommand, { orderId: string }> {
  readonly handled: PlaceOrderCommand[] = [];

  constructor(
    private readonly orders: AggregateSaver<Order>,
    private readonly bus: EventBus<OrderEvent>,
  ) {
    super();
  }

  protected toCommand(input: PlaceOrderInput): PlaceOrderCommand {
    return ValueObjects.build({
      orderId: () => new OrderId(input.orderId),
      customer: () => new CustomerName(input.customer),
    });
  }

  protected async handle(command: PlaceOrderCommand): Promise<{ orderId: string }> {
    this.handled.push(command);
    const order = Order.place(command.orderId, command.customer);
    await this.orders.save(order);
    await this.bus.publish(order.pullDomainEvents());
    return { orderId: order.id.value };
  }
}

class ShipOrder extends UseCase<{ orderId: string }, OrderId, void> {
  constructor(
    private readonly orders: AggregateFinder<Order> & AggregateSaver<Order>,
    private readonly bus: EventBus<OrderEvent>,
  ) {
    super();
  }

  protected toCommand(input: { orderId: string }): OrderId {
    return new OrderId(input.orderId);
  }

  protected async handle(orderId: OrderId): Promise<void> {
    const order = await this.orders.findById(orderId);
    if (order === null) {
      throw new AggregateNotFoundException('Order', orderId.value);
    }
    order.ship();
    await this.orders.save(order);
    await this.bus.publish(order.pullDomainEvents());
  }
}

class Throwing extends UseCase<unknown, unknown, never> {
  constructor(private readonly thrown: unknown) {
    super();
  }

  protected toCommand(input: unknown): unknown {
    return input;
  }

  protected async handle(): Promise<never> {
    throw this.thrown;
  }
}

class RefundPayment extends UseCase<{ amount: string }, number, number> {
  protected toCommand(input: { amount: string }): number {
    if (Number.isNaN(Number(input.amount))) {
      throw new Error(`"${input.amount}" is not an amount`);
    }
    return Number(input.amount);
  }

  protected handle(amount: number): number {
    return amount;
  }
}

const orderId = '9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c';
const missingId = '3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f';

function setup() {
  const log: string[] = [];
  const orders = new FakeOrderRepository(log);
  const bus = new FakeEventBus(log);
  return {
    log,
    orders,
    bus,
    placeOrder: new PlaceOrder(orders, bus),
    shipOrder: new ShipOrder(orders, bus),
  };
}

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('expected the use case to reject');
}

describe('UseCase: an application service a controller or a message handler calls', () => {
  describe('typing', () => {
    it('execute takes the input DTO and resolves to the output', () => {
      expectTypeOf<PlaceOrder['execute']>().toEqualTypeOf<
        (input: PlaceOrderInput) => Promise<{ orderId: string }>
      >();
    });

    it('offers nothing but execute: loading, saving and publishing are written in handle', () => {
      const { placeOrder } = setup();
      const members = Object.getOwnPropertyNames(UseCase.prototype).sort();
      expect(members).toEqual(['constructor', 'execute']);
      expect('findOrFail' in placeOrder).toBe(false);
      expect('saveAndPublish' in placeOrder).toBe(false);
    });

    it('handle is only reachable through execute', async () => {
      const { placeOrder } = setup();
      // @ts-expect-error handle is protected: callers go through execute
      await placeOrder.handle({
        orderId: new OrderId(orderId),
        customer: new CustomerName('Ana'),
      });
      expect(true).toBe(true);
    });
  });

  describe('placing an order', () => {
    it('returns what handle returns', async () => {
      const { placeOrder } = setup();
      expect(await placeOrder.execute({ orderId, customer: 'Ana' })).toEqual({ orderId });
    });

    it('saves the order before publishing its events', async () => {
      const { placeOrder, log, orders, bus } = setup();
      await placeOrder.execute({ orderId, customer: 'Ana' });
      expect(log).toEqual([`save ${orderId}`, 'publish OrderPlaced']);
      expect(orders.rows.get(orderId)).toEqual({
        id: orderId,
        customer: 'Ana',
        shipped: false,
      });
      expect(bus.published).toMatchObject([{ aggregateId: orderId, customer: 'Ana' }]);
    });

    it('publishes nothing when saving fails', async () => {
      const { placeOrder, orders, bus } = setup();
      orders.failWith = new Error('connection reset');
      await expect(placeOrder.execute({ orderId, customer: 'Ana' })).rejects.toThrow(
        InternalErrorException,
      );
      expect(bus.published).toEqual([]);
    });

    it('lets ValidationException from the value objects reach the controller as it is', async () => {
      const { placeOrder, orders } = setup();
      const error = await rejection(placeOrder.execute({ orderId, customer: 'A' }));
      expect(error).toBeInstanceOf(ValidationException);
      expect((error as ValidationException).errors).toEqual([
        {
          field: 'customer',
          code: 'isLength',
          message: 'CustomerName: Value does not satisfy isLength',
        },
      ]);
      expect(orders.rows.size).toBe(0);
    });

    it('reports every invalid field of the input at once, never only the first one', async () => {
      const { placeOrder, log } = setup();
      const error = await rejection(placeOrder.execute({ orderId: 'not-an-id', customer: '' }));
      expect(error).toBeInstanceOf(ValidationException);
      expect((error as ValidationException).errors).toEqual([
        {
          field: 'orderId',
          code: 'DOM003',
          message: 'Validation Error: Expected a valid UUID, but received "not-an-id".',
        },
        {
          field: 'customer',
          code: 'DOM004',
          message: 'Validation Error: CustomerName is required, but received "".',
        },
      ]);
      expect(log).toEqual([]);
    });
  });

  describe('building the command from the input', () => {
    it('hands handle value objects, never the raw input', async () => {
      const { placeOrder } = setup();
      await placeOrder.execute({ orderId: orderId.toUpperCase(), customer: 'Ana' });
      const [command] = placeOrder.handled;
      expect(command.orderId).toBeInstanceOf(OrderId);
      expect(command.orderId.value).toBe(orderId);
      expect(command.customer).toBeInstanceOf(CustomerName);
    });

    it('never reaches handle when the input does not make valid value objects', async () => {
      const { placeOrder, log } = setup();
      await expect(placeOrder.execute({ orderId: 'not-an-id', customer: 'Ana' })).rejects.toThrow(
        'Expected a valid UUID',
      );
      expect(placeOrder.handled).toEqual([]);
      expect(log).toEqual([]);
    });

    it('wraps a raw error thrown while building the command, naming the use case', async () => {
      const error = await rejection(new RefundPayment().execute({ amount: 'ten' }));
      expect(error).toBeInstanceOf(InternalErrorException);
      expect((error as InternalErrorException).message).toBe(
        'Failed, internal error: RefundPayment: "ten" is not an amount',
      );
    });

    it('passes a command that is not an object straight to handle', async () => {
      expect(await new RefundPayment().execute({ amount: '12.5' })).toBe(12.5);
    });

    it('toCommand is only reachable through execute', () => {
      // @ts-expect-error toCommand is protected: callers go through execute
      expect(new RefundPayment().toCommand({ amount: '1' })).toBe(1);
    });
  });

  describe('shipping an existing order', () => {
    it('loads it, ships it and publishes only the new event', async () => {
      const { placeOrder, shipOrder, bus, orders } = setup();
      await placeOrder.execute({ orderId, customer: 'Ana' });
      await shipOrder.execute({ orderId });
      expect(bus.published.map((event) => event.eventName())).toEqual([
        'OrderPlaced',
        'OrderShipped',
      ]);
      expect(orders.rows.get(orderId)).toMatchObject({ shipped: true });
    });

    it('rejects with AggregateNotFoundException when the order does not exist', async () => {
      const { shipOrder } = setup();
      const error = await rejection(shipOrder.execute({ orderId: missingId }));
      expect(error).toBeInstanceOf(AggregateNotFoundException);
      expect((error as AggregateNotFoundException).message).toBe(
        `Order with ID ${missingId} not found.`,
      );
    });

    it('lets a business rule exception through untouched', async () => {
      const { placeOrder, shipOrder } = setup();
      await placeOrder.execute({ orderId, customer: 'Ana' });
      await shipOrder.execute({ orderId });
      const error = await rejection(shipOrder.execute({ orderId }));
      expect(error).toBeInstanceOf(OrderAlreadyShippedException);
      expect((error as DomainException).code).toBe('ORD001');
    });
  });

  describe('unexpected failures', () => {
    it('wraps a raw driver error in InternalErrorException naming the use case, keeping the cause', async () => {
      const { placeOrder, orders } = setup();
      const driverError = new Error('connection reset');
      orders.failWith = driverError;
      const error = await rejection(placeOrder.execute({ orderId, customer: 'Ana' }));
      expect(error).toBeInstanceOf(InternalErrorException);
      expect((error as InternalErrorException).message).toBe(
        'Failed, internal error: PlaceOrder: connection reset',
      );
      expect((error as InternalErrorException).cause).toBe(driverError);
      expect((error as InternalErrorException).code).toBe('INF001');
    });

    it.each([
      ['a thrown string', 'timeout', 'timeout'],
      ['a thrown object', { code: 'E1' }, '{"code":"E1"}'],
      ['a thrown number', 42, '42'],
    ])('describes %s in the message', async (_, thrown, described) => {
      const error = await rejection(new Throwing(thrown).execute(undefined));
      expect((error as InternalErrorException).message).toBe(
        `Failed, internal error: Throwing: ${described}`,
      );
      expect((error as InternalErrorException).cause).toBe(thrown);
    });

    it.each([
      ['an ApplicationException', new ApplicationException('Email already registered', ['USR002'])],
      ['an InternalErrorException', new InternalErrorException('disk full')],
      ['a DomainException', new DomainException('Stock cannot be negative')],
    ])('rethrows %s as the same instance', async (_, thrown) => {
      expect(await rejection(new Throwing(thrown).execute(undefined))).toBe(thrown);
    });
  });
});
