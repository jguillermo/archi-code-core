import { AggregateRoot, CreatedAt, UpdatedAt } from '../../../../ddd/domain';
import type { PrimitiveTypes } from '../../../../ddd/domain';
import { Carrier, CarrierType } from './carrier';
import { CarrierLabel } from './carrier-label';
import { ExpectedDelivery } from './expected-delivery';
import type { GiftWrapRequested } from './gift-wrap-requested';
import { OrderReference } from './order-reference';
import { ShipmentAddress } from './shipment-address';
import { ShipmentContents } from './shipment-contents';
import {
  ShipmentCancelled,
  ShipmentDelivered,
  ShipmentDispatched,
  ShipmentPrepared,
} from './shipment-events';
import type { ShipmentEvent } from './shipment-events';
import {
  MissingTrackingNumberException,
  ShipmentNotDeliverableException,
  ShipmentNotDispatchableException,
} from './shipment-exceptions';
import { ShipmentId } from './shipment-id';
import { ShipmentStatus, ShipmentStatusType } from './shipment-status';
import { TrackingNumber } from './tracking-number';

export interface ShipmentRequest {
  orderReference: OrderReference;
  address: ShipmentAddress;
  contents: ShipmentContents;
  giftWrap: GiftWrapRequested;
}

interface Clock {
  now(): Date;
}

export class Shipment extends AggregateRoot<ShipmentId, ShipmentEvent> {
  private static readonly DAY_MS = 24 * 60 * 60 * 1000;
  private static readonly HOME_COUNTRY = 'ES';

  private constructor(
    id: ShipmentId,
    readonly orderReference: OrderReference,
    readonly address: ShipmentAddress,
    readonly contents: ShipmentContents,
    readonly carrier: CarrierType,
    readonly carrierLabel: CarrierLabel,
    readonly expectedDelivery: ExpectedDelivery,
    private _status: ShipmentStatusType,
    private _trackingNumber: TrackingNumber,
    readonly createdAt: CreatedAt,
    private _updatedAt: UpdatedAt,
  ) {
    super(id);
  }

  static prepare(request: ShipmentRequest, clock: Clock): Shipment {
    const domestic = request.address.country.value === Shipment.HOME_COUNTRY;
    const carrier = new CarrierType(domestic ? Carrier.SEUR : Carrier.DHL);
    const shipment = new Shipment(
      ShipmentId.forOrder(request.orderReference),
      request.orderReference,
      request.address,
      request.contents,
      carrier,
      new CarrierLabel({
        carrier: carrier.value,
        service: request.giftWrap.value ? 'gift' : 'standard',
        country: request.address.country.value,
        units: request.contents.units(),
      }),
      new ExpectedDelivery(new Date(clock.now().getTime() + (domestic ? 2 : 5) * Shipment.DAY_MS)),
      new ShipmentStatusType(ShipmentStatus.PREPARING),
      new TrackingNumber(null),
      CreatedAt.now(clock),
      UpdatedAt.now(clock),
    );
    shipment.record(
      new ShipmentPrepared(
        shipment.id.value,
        shipment.orderReference.value,
        carrier.value,
        shipment.expectedDelivery.toString(),
        { clock },
      ),
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
      throw new ShipmentNotDispatchableException(this.id.value, this._status.value);
    }
    if (trackingNumber.isNull) {
      throw new MissingTrackingNumberException(this.id.value);
    }
    this._trackingNumber = trackingNumber;
    this.moveTo(ShipmentStatus.DISPATCHED, clock);
    this.record(
      new ShipmentDispatched(
        this.id.value,
        this.orderReference.value,
        trackingNumber.toString(),
        this.carrier.value,
        { clock },
      ),
    );
  }

  deliver(clock: Clock): void {
    if (this._status.value !== ShipmentStatus.DISPATCHED) {
      throw new ShipmentNotDeliverableException(this.id.value, this._status.value);
    }
    this.moveTo(ShipmentStatus.DELIVERED, clock);
    this.record(new ShipmentDelivered(this.id.value, this.orderReference.value, { clock }));
  }

  cancelForCancelledOrder(clock: Clock): void {
    if (this._status.value !== ShipmentStatus.PREPARING) {
      return;
    }
    this.moveTo(ShipmentStatus.CANCELLED, clock);
    this.record(new ShipmentCancelled(this.id.value, this.orderReference.value, { clock }));
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
