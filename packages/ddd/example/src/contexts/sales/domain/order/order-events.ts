import { EventBase } from '../../../../ddd/domain';
import type { EventMetadata } from '../../../../ddd/domain';

export interface MoneyData {
  amount: number;
  currency: string;
}

export interface AddressData {
  recipient: { name: string; phone: string };
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface PlacedLineData {
  sku: string;
  quantity: number;
  unitPrice: MoneyData;
}

export interface ItemData {
  sku: string;
  quantity: number;
}

export class OrderPlaced extends EventBase {
  static readonly eventName = 'sales.order.OrderPlaced';

  constructor(
    readonly orderId: string,
    readonly customerId: string,
    readonly lines: PlacedLineData[],
    readonly total: MoneyData,
    readonly paymentMethod: string,
    readonly freeShipping: boolean,
    metadata?: EventMetadata,
  ) {
    super(metadata);
  }
}

export class OrderLineQuantityChanged extends EventBase {
  static readonly eventName = 'sales.order.OrderLineQuantityChanged';

  constructor(
    readonly orderId: string,
    readonly lineNumber: number,
    readonly quantity: number,
    readonly total: MoneyData,
    metadata?: EventMetadata,
  ) {
    super(metadata);
  }
}

export class ShippingAddressChanged extends EventBase {
  static readonly eventName = 'sales.order.ShippingAddressChanged';

  constructor(
    readonly orderId: string,
    readonly address: AddressData,
    metadata?: EventMetadata,
  ) {
    super(metadata);
  }
}

export class OrderPaid extends EventBase {
  static readonly eventName = 'sales.order.OrderPaid';

  constructor(
    readonly orderId: string,
    readonly paymentId: string,
    readonly address: AddressData,
    readonly items: ItemData[],
    readonly giftWrap: boolean,
    metadata?: EventMetadata,
  ) {
    super(metadata);
  }
}

export class OrderCancelled extends EventBase {
  static readonly eventName = 'sales.order.OrderCancelled';

  constructor(
    readonly orderId: string,
    readonly reason: string,
    readonly wasPaid: boolean,
    metadata?: EventMetadata,
  ) {
    super(metadata);
  }
}

export class OrderShipped extends EventBase {
  static readonly eventName = 'sales.order.OrderShipped';

  constructor(
    readonly orderId: string,
    readonly trackingNumber: string,
    metadata?: EventMetadata,
  ) {
    super(metadata);
  }
}

export class OrderDelivered extends EventBase {
  static readonly eventName = 'sales.order.OrderDelivered';

  constructor(
    readonly orderId: string,
    metadata?: EventMetadata,
  ) {
    super(metadata);
  }
}

export type OrderEvent =
  | OrderPlaced
  | OrderLineQuantityChanged
  | ShippingAddressChanged
  | OrderPaid
  | OrderCancelled
  | OrderShipped
  | OrderDelivered;
