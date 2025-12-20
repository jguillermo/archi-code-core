import { AssetId } from './types/asset-id';
import { AssetName } from './types/asset-name';
import { AssetAcquisitionValue } from './types/asset-acquisition-value';
import { AssetAcquisitionDate } from './types/asset-acquisition-date';
import { AssetUsefulLife } from './types/asset-useful-life';
import { AssetDepreciationMethod } from './types/asset-depreciation-method';
import { AssetResidualValue } from './types/asset-residual-value';
import { AssetAssociatedCosts } from './types/asset-associated-costs';
import { AssetLastDepreciationDate } from './types/asset-last-depreciation-date';
import { AggregateTypes, DataTypes } from '@code-core/domain';

export class AssetTypes extends AggregateTypes {
  public readonly id: AssetId;
  public readonly name: AssetName;
  public readonly acquisitionDate: AssetAcquisitionDate;
  public readonly acquisitionValue: AssetAcquisitionValue;
  public readonly usefulLife: AssetUsefulLife;
  public readonly depreciationMethod: AssetDepreciationMethod;
  public readonly residualValue: AssetResidualValue;
  public readonly associatedCosts: AssetAssociatedCosts;
  public readonly lastDepreciationDate: AssetLastDepreciationDate;

  constructor(currentLevel: number, params: DataTypes<AssetTypes>) {
    super(currentLevel);
    this.id = this.initializeType(AssetId, params.id);
    this.name = this.initializeType(AssetName, params.name);
    this.acquisitionDate = this.initializeType(AssetAcquisitionDate, params.acquisitionDate);
    this.acquisitionValue = this.initializeType(AssetAcquisitionValue, params.acquisitionValue);
    this.usefulLife = this.initializeType(AssetUsefulLife, params.usefulLife);
    this.depreciationMethod = this.initializeType(AssetDepreciationMethod, params.depreciationMethod);
    this.residualValue = this.initializeType(AssetResidualValue, params.residualValue);
    this.associatedCosts = this.initializeType(AssetAssociatedCosts, params.associatedCosts);
    this.lastDepreciationDate = this.initializeType(AssetLastDepreciationDate, params.lastDepreciationDate);
  }
}
