import type { JsonTypeValue } from '../../../../ddd/domain';

export interface CarrierLabelData extends JsonTypeValue {
  carrier: string;
  service: 'standard' | 'gift';
  country: string;
  units: number;
}
