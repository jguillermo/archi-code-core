import { EnumType } from '../../../../ddd/domain';

export enum Carrier {
  SEUR = 'seur',
  DHL = 'dhl',
}

export class CarrierType extends EnumType<Carrier> {
  protected getEnum(): typeof Carrier {
    return Carrier;
  }
}
