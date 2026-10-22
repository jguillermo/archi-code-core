import { toJson } from '@archi-code/validation';
import { AbstractType } from './abstract-type';
import { TypePrimitiveException } from '../../exceptions/index';

export type JsonTypeValue = Record<string, any>;

export class JsonType<T extends JsonTypeValue = JsonTypeValue> extends AbstractType<T> {
  protected filter(value: unknown): T {
    const converted = toJson(value);
    if (!converted.ok) {
      throw new TypePrimitiveException('Json', value);
    }
    return JsonType.deepFreeze(JSON.parse(JSON.stringify(converted.value)));
  }

  protected hasSameValue(other: this): boolean {
    return JsonType.sameJson(this._value, other._value);
  }

  private static sameJson(left: unknown, right: unknown): boolean {
    if (Array.isArray(left) || Array.isArray(right)) {
      return (
        Array.isArray(left) &&
        Array.isArray(right) &&
        left.length === right.length &&
        left.every((item, index) => JsonType.sameJson(item, right[index]))
      );
    }
    if (JsonType.isObject(left) && JsonType.isObject(right)) {
      const keys = Object.keys(left);
      return (
        keys.length === Object.keys(right).length &&
        keys.every(
          (key) =>
            Object.prototype.hasOwnProperty.call(right, key) &&
            JsonType.sameJson(left[key], right[key]),
        )
      );
    }
    return left === right;
  }

  private static deepFreeze<V>(value: V): V {
    if (JsonType.isObject(value)) {
      Object.freeze(value);
      for (const child of Object.values(value)) {
        JsonType.deepFreeze(child);
      }
    }
    return value;
  }

  private static isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
