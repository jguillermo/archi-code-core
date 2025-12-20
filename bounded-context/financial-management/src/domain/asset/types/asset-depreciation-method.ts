import { AbstractEnumType, AddValidate, Level } from '@code-core/domain';

enum AssetDepreciationMethodEnum {
  LINEAR = 'linear',
  DECLINING_BALANCE = 'decliningBalance',
}

@Level(2)
@AddValidate([{ validator: 'IsEnum', value: AssetDepreciationMethodEnum }, { validator: 'IsNotEmpty' }])
export class AssetDepreciationMethod extends AbstractEnumType<AssetDepreciationMethodEnum> {
  protected getEnum(): Record<string, AssetDepreciationMethodEnum> {
    return AssetDepreciationMethodEnum;
  }
}
