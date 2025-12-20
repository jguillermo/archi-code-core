import { AbstractType } from '../type/abstract-type';
import { getLevel, normalizeLevel } from '../level/level.decorator';
import { DomainException } from '../exceptions';

export class AggregateTypes {
  private readonly _currentLevelNormalized: number;

  constructor(currentLevel: number) {
    this._currentLevelNormalized = normalizeLevel(currentLevel);
  }

  protected initializeType<T extends AbstractType<any>>(typeClass: { new (data: any): T; empty?: () => T }, data): T {
    const voLevel = getLevel(typeClass);
    const isEmpty = data === null || data === undefined;
    if (voLevel > this._currentLevelNormalized && isEmpty) {
      if (typeClass.empty) {
        return typeClass.empty();
      }
      throw new DomainException(`${typeClass.name} cannot be static empty()`);
    }
    const typeInstance: T = new typeClass(data);
    if (!typeInstance.isValid()) {
      throw new DomainException(`${(typeClass as any).name}: ${typeInstance.validatorMessageStr()}`);
    }
    return typeInstance;
  }
}
