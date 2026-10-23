import { EnumType, Required } from '../../../../ddd/domain';

export enum Carrier {
  SEUR = 'seur',
  DHL = 'dhl',
}

export class CarrierOption extends EnumType<Carrier> {
  protected getEnum(): typeof Carrier {
    return Carrier;
  }
}

export class CarrierType extends Required(CarrierOption) {}
