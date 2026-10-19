import { Required } from './required/required';
import { UuidType } from './uuid-type';
import { TypePrimitiveException } from '../../exceptions/index';

const NIL_OR_MAX_UUID = /^(?:0{8}-0{4}-0{4}-0{4}-0{12}|f{8}-f{4}-f{4}-f{4}-f{12})$/i;

export class IdType<Brand extends string = string> extends Required(UuidType) {
  declare protected readonly idBrand: Brand;

  protected filter(value: unknown): string {
    const id = super.filter(value);
    if (NIL_OR_MAX_UUID.test(id)) {
      throw new TypePrimitiveException('Id', value);
    }
    return id;
  }
}
