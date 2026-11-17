import {
  AggregateRoot,
  CreatedAt,
  DomainException,
  EnumType,
  EventBase,
  IdType,
  Required,
  StringType,
  UpdatedAt,
} from '../../../../src/domain/index';
import type { EventMetadata, PrimitiveTypes } from '../../../../src/domain/index';

export class OrderId extends IdType<'OrderId'> {}

export class CustomerId extends Required(StringType) {}

export class Sku extends Required(StringType) {}

export enum OrderStatus {
  PLACED = 'placed',
  SHIPPED = 'shipped',
}

export class OrderStatusOption extends EnumType<OrderStatus> {
  protected getEnum(): typeof OrderStatus {
    return OrderStatus;
  }
}

export class OrderStatusType extends Required(OrderStatusOption) {}

export class OrderAlreadyShipped extends DomainException {
  constructor(orderId: string) {
    super(`Order ${orderId} is already shipped and can no longer change`, ['SAL001']);
  }
}

export class OrderPlacedDomainEvent extends EventBase {
  static readonly eventName = 'order.placed';

  readonly orderId: string;
  readonly customerId: string;

  constructor({
    orderId,
    customerId,
    eventId,
    occurredOn,
  }: { orderId: string; customerId: string } & EventMetadata) {
    super({ eventId, occurredOn });
    this.orderId = orderId;
    this.customerId = customerId;
  }
}

export class Order extends AggregateRoot<OrderId> {
  readonly customerId: CustomerId;
  private _lines: Sku[];
  private _status: OrderStatusType;
  readonly createdAt: CreatedAt;
  private _updatedAt: UpdatedAt;

  constructor(
    id: OrderId,
    customerId: CustomerId,
    lines: Sku[],
    status: OrderStatusType,
    createdAt: CreatedAt,
    updatedAt: UpdatedAt,
  ) {
    super(id);
    this.customerId = customerId;
    this._lines = lines;
    this._status = status;
    this.createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  static place(id: OrderId, customerId: CustomerId): Order {
    const order = new Order(
      id,
      customerId,
      [],
      new OrderStatusType(OrderStatus.PLACED),
      CreatedAt.now(),
      UpdatedAt.now(),
    );
    order.record(new OrderPlacedDomainEvent({ orderId: id.value, customerId: customerId.value }));
    return order;
  }

  static fromPrimitives(primitives: PrimitiveTypes<Order>): Order {
    return new Order(
      new OrderId(primitives.id),
      new CustomerId(primitives.customerId),
      primitives.lines.map((sku) => new Sku(sku)),
      new OrderStatusType(primitives.status),
      new CreatedAt(primitives.createdAt),
      new UpdatedAt(primitives.updatedAt),
    );
  }

  get lines(): Sku[] {
    return [...this._lines];
  }

  get status(): OrderStatusType {
    return this._status;
  }

  get updatedAt(): UpdatedAt {
    return this._updatedAt;
  }

  addLine(sku: Sku): void {
    this.assertNotShipped();
    this._lines = [...this._lines, sku];
    this._updatedAt = UpdatedAt.now();
  }

  ship(): void {
    this.assertNotShipped();
    this._status = new OrderStatusType(OrderStatus.SHIPPED);
    this._updatedAt = UpdatedAt.now();
  }

  toPrimitives(): PrimitiveTypes<Order> {
    return {
      id: this.id.value,
      customerId: this.customerId.value,
      lines: this._lines.map((line) => line.value),
      status: this._status.value,
      createdAt: this.createdAt.value,
      updatedAt: this._updatedAt.value,
    };
  }

  private assertNotShipped(): void {
    if (this._status.value === OrderStatus.SHIPPED) {
      throw new OrderAlreadyShipped(this.id.value);
    }
  }
}
