import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';
import { AbstractType } from './abstract-type';
import { AddValidate } from '../validator/decorator/type-validator';
import { isUUID } from 'class-validator';
import { TypePrimitiveException } from '../exceptions/domain/type-primitive.exception';

const DNS_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

@AddValidate([{ validator: 'IsUUID' }])
export class AbstractUuidType<R extends null | undefined = undefined> extends AbstractType<
  string,
  R
> {
  static random(): string {
    return uuidv4();
  }

  static fromValue(value: string, namespace: string = DNS_NAMESPACE): string {
    return uuidv5(value, namespace);
  }

  protected filter(value: any): any {
    if (value === null) {
      return null;
    }

    if (!isUUID(value)) {
      throw new TypePrimitiveException('UUID', value);
    }

    return value;
  }
}
