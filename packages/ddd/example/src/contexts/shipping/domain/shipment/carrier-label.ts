import { JsonType, Required } from '../../../../ddd/domain';
import type { JsonTypeValue } from '../../../../ddd/domain';

export interface CarrierLabelData extends JsonTypeValue {
  carrier: string;
  service: 'standard' | 'gift';
  country: string;
  units: number;
}

export class CarrierLabelJson extends JsonType<CarrierLabelData> {}

export class CarrierLabel extends Required(CarrierLabelJson) {}
