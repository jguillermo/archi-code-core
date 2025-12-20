import { AggregateTypes, DataTypes } from '@code-core/domain';
import { LiabilityDescription } from './types/liability-description';
import { LiabilityId } from './types/liability-id';
import { LiabilityAmount } from './types/liability-amount';
import { LiabilityCreationDate } from './types/liability-creation-date';
import { LiabilityDueDate } from './types/liability-due-date';
import { LiabilityCreditorEntity } from './types/liability-creditor-entity';

export class LiabilityTypes extends AggregateTypes {
  public readonly id: LiabilityId;
  public readonly description: LiabilityDescription;
  public readonly amount: LiabilityAmount;
  public readonly creationDate: LiabilityCreationDate;
  public readonly dueDate: LiabilityDueDate;
  public readonly creditorEntity: LiabilityCreditorEntity;

  constructor(currentLevel: number, params: DataTypes<LiabilityTypes>) {
    super(currentLevel);
    this.id = this.initializeType(LiabilityId, params.id);
    this.description = this.initializeType(LiabilityDescription, params.description);
    this.amount = this.initializeType(LiabilityAmount, params.amount);
    this.creationDate = this.initializeType(LiabilityCreationDate, params.creationDate);
    this.dueDate = this.initializeType(LiabilityDueDate, params.dueDate);
    this.creditorEntity = this.initializeType(LiabilityCreditorEntity, params.creditorEntity);
  }
}
