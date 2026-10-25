import { AggregateRoot, CreatedAt, UpdatedAt } from '../../../../ddd/domain';
import type { PrimitiveTypes } from '../../../../ddd/domain';
import { Carrier } from '../value-object/CarrierType';
import { CarrierLabel } from '../value-object/CarrierLabel';
import { CarrierType } from '../value-object/CarrierType';
import { ExpectedDelivery } from '../value-object/ExpectedDelivery';
import type { GiftWrapRequested } from '../value-object/GiftWrapRequested';
import { OrderReference } from '../value-object/OrderReference';
import { ShipmentAddress } from '../value-object/ShipmentAddress';
import { ShipmentCancelledDomainEvent } from '../event/ShipmentCancelledDomainEvent';
import { ShipmentContents } from '../value-object/ShipmentContents';
import { ShipmentDeliveredDomainEvent } from '../event/ShipmentDeliveredDomainEvent';
import { ShipmentDispatchedDomainEvent } from '../event/ShipmentDispatchedDomainEvent';
import type { ShipmentEvent } from '../event/ShipmentEvent';
import { ShipmentId } from '../value-object/ShipmentId';
import { ShipmentNotDeliverable } from '../exception/ShipmentNotDeliverable';
import { ShipmentNotDispatchable } from '../exception/ShipmentNotDispatchable';
import { ShipmentCreatedDomainEvent } from '../event/ShipmentCreatedDomainEvent';
import { ShipmentStatus } from '../value-object/ShipmentStatusType';
import { ShipmentStatusType } from '../value-object/ShipmentStatusType';
import { TrackingNumber } from '../value-object/TrackingNumber';
import { TrackingNumberMissing } from '../exception/TrackingNumberMissing';

interface Clock {
  now(): Date;
}

export class Shipment extends AggregateRoot<ShipmentId, ShipmentEvent> {
  private static readonly DAY_MS = 24 * 60 * 60 * 1000;
  private static readonly HOME_COUNTRY = 'ES';

  readonly orderReference: OrderReference;
  readonly address: ShipmentAddress;
  readonly contents: ShipmentContents;
  readonly carrier: CarrierType;
  readonly carrierLabel: CarrierLabel;
  readonly expectedDelivery: ExpectedDelivery;
  private _status: ShipmentStatusType;
  private _trackingNumber: TrackingNumber;
  readonly createdAt: CreatedAt;
  private _updatedAt: UpdatedAt;

  constructor(
    id: ShipmentId,
    orderReference: OrderReference,
    address: ShipmentAddress,
    contents: ShipmentContents,
    carrier: CarrierType,
    carrierLabel: CarrierLabel,
    expectedDelivery: ExpectedDelivery,
    status: ShipmentStatusType,
    trackingNumber: TrackingNumber,
    createdAt: CreatedAt,
    updatedAt: UpdatedAt,
  ) {
    super(id);
    this.orderReference = orderReference;
    this.address = address;
    this.contents = contents;
    this.carrier = carrier;
    this.carrierLabel = carrierLabel;
    this.expectedDelivery = expectedDelivery;
    this._status = status;
    this._trackingNumber = trackingNumber;
    this.createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  static create(
    id: ShipmentId,
    orderReference: OrderReference,
    address: ShipmentAddress,
    contents: ShipmentContents,
    giftWrap: GiftWrapRequested,
    clock: Clock,
  ): Shipment {
    const domestic = address.country.value === Shipment.HOME_COUNTRY;
    const carrier = new CarrierType(domestic ? Carrier.SEUR : Carrier.DHL);
    const shipment = new Shipment(
      id,
      orderReference,
      address,
      contents,
      carrier,
      new CarrierLabel({
        carrier: carrier.value,
        service: giftWrap.value ? 'gift' : 'standard',
        country: address.country.value,
        units: contents.units(),
      }),
      new ExpectedDelivery(new Date(clock.now().getTime() + (domestic ? 2 : 5) * Shipment.DAY_MS)),
      new ShipmentStatusType(ShipmentStatus.PREPARING),
      new TrackingNumber(null),
      CreatedAt.now(clock),
      UpdatedAt.now(clock),
    );

    shipment.record(
      new ShipmentCreatedDomainEvent({
        shipmentId: shipment.id.value,
        orderId: shipment.orderReference.value,
        carrier: carrier.value,
        expectedDeliveryOn: shipment.expectedDelivery.toString(),
        clock,
      }),
    );

    return shipment;
  }

  static fromPrimitives(primitives: PrimitiveTypes<Shipment>): Shipment {
    return new Shipment(
      new ShipmentId(primitives.id),
      new OrderReference(primitives.orderReference),
      ShipmentAddress.fromPrimitives(primitives.address),
      ShipmentContents.fromPrimitives(primitives.contents),
      new CarrierType(primitives.carrier),
      new CarrierLabel(primitives.carrierLabel),
      new ExpectedDelivery(primitives.expectedDelivery),
      new ShipmentStatusType(primitives.status),
      new TrackingNumber(primitives.trackingNumber),
      new CreatedAt(primitives.createdAt),
      new UpdatedAt(primitives.updatedAt),
    );
  }

  get status(): ShipmentStatusType {
    return this._status;
  }

  get trackingNumber(): TrackingNumber {
    return this._trackingNumber;
  }

  get updatedAt(): UpdatedAt {
    return this._updatedAt;
  }

  dispatch(trackingNumber: TrackingNumber, clock: Clock): void {
    if (this._status.value !== ShipmentStatus.PREPARING) {
      throw new ShipmentNotDispatchable(this.id.value, this._status.value);
    }
    if (trackingNumber.isNull) {
      throw new TrackingNumberMissing(this.id.value);
    }
    this._trackingNumber = trackingNumber;
    this.moveTo(ShipmentStatus.DISPATCHED, clock);
    this.record(
      new ShipmentDispatchedDomainEvent({
        shipmentId: this.id.value,
        orderId: this.orderReference.value,
        trackingNumber: trackingNumber.toString(),
        carrier: this.carrier.value,
        clock,
      }),
    );
  }

  deliver(clock: Clock): void {
    if (this._status.value !== ShipmentStatus.DISPATCHED) {
      throw new ShipmentNotDeliverable(this.id.value, this._status.value);
    }
    this.moveTo(ShipmentStatus.DELIVERED, clock);
    this.record(
      new ShipmentDeliveredDomainEvent({
        shipmentId: this.id.value,
        orderId: this.orderReference.value,
        clock,
      }),
    );
  }

  cancelForCancelledOrder(clock: Clock): void {
    if (this._status.value !== ShipmentStatus.PREPARING) {
      return;
    }
    this.moveTo(ShipmentStatus.CANCELLED, clock);
    this.record(
      new ShipmentCancelledDomainEvent({
        shipmentId: this.id.value,
        orderId: this.orderReference.value,
        clock,
      }),
    );
  }

  toPrimitives(): PrimitiveTypes<Shipment> {
    return {
      id: this.id.value,
      orderReference: this.orderReference.value,
      address: this.address.toPrimitives(),
      contents: this.contents.toPrimitives(),
      carrier: this.carrier.value,
      carrierLabel: this.carrierLabel.value,
      expectedDelivery: this.expectedDelivery.value,
      status: this._status.value,
      trackingNumber: this._trackingNumber.value,
      createdAt: this.createdAt.value,
      updatedAt: this._updatedAt.value,
    };
  }

  private moveTo(status: ShipmentStatus, clock: Clock): void {
    this._status = new ShipmentStatusType(status);
    this._updatedAt = UpdatedAt.now(clock);
  }
}
