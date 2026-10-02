import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';
import { isUUID } from '@archi-code/validation';
import { AbstractType } from './abstract-type';
import { Required } from './required/required';
import { TypePrimitiveException } from '../exceptions/domain/type-primitive.exception';

const DNS_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

export class UuidType extends AbstractType<string> {
  static random(): string {
    return uuidv4();
  }

  static fromValue(value: string, namespace: string = DNS_NAMESPACE): string {
    return uuidv5(value, namespace);
  }

  protected filter(value: unknown): string {
    if (typeof value !== 'string' || !isUUID(value)) {
      throw new TypePrimitiveException('UUID', value);
    }
    return value;
  }
}

export class IdType extends Required(UuidType) {}
