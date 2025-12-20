import { AbstractType } from './abstract-type';
import { AddValidate } from '../validator/decorator/type-validator';
import { CanBeStringValidator } from '../validator/decorator/custom/can-be-string';

import { TypePrimitiveException } from '../exceptions/domain/type-primitive.exception';
import { StringValidator } from '../validator';

@AddValidate([{ validator: CanBeStringValidator }])
export class AbstractStringType<R extends null | undefined = undefined> extends AbstractType<string, R> {
  protected filter(value: any): any {
    if (value === null) {
      return null;
    }

    if (!StringValidator.canBeString(value)) {
      throw new TypePrimitiveException('String', value);
    }
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }
    return `${value}`;
  }
}
