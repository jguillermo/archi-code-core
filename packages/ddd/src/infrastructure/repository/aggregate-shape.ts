import { AbstractType } from '../../domain/index';
import { InternalErrorException } from '../../exceptions/index';

export class AggregateShape {
  static assert(aggregateName: string, aggregate: object, primitives: object): void {
    for (const [key, value] of Object.entries(aggregate)) {
      AggregateShape.assertValueObjects(`${aggregateName}.${key}`, value);
    }
    AggregateShape.assertStored(aggregateName, aggregate, primitives);
    AggregateShape.assertPlain(aggregateName, 'primitives', primitives);
  }

  private static assertValueObjects(path: string, value: unknown): void {
    if (value instanceof AbstractType || value === null) {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => AggregateShape.assertValueObjects(`${path}[${index}]`, item));
      return;
    }
    if (typeof value === 'object' && !(value instanceof Date)) {
      for (const [key, child] of Object.entries(value)) {
        AggregateShape.assertValueObjects(`${path}.${key}`, child);
      }
      return;
    }
    throw new InternalErrorException(
      `${path} is ${AggregateShape.describe(value)}, not a value object`,
    );
  }

  private static assertStored(path: string, owner: object, primitive: unknown): void {
    const stored = primitive as Record<string, unknown>;
    for (const [key, member] of Object.entries(owner)) {
      const primitiveKey = AggregateShape.primitiveKey(key);
      if (typeof stored !== 'object' || stored === null || !(primitiveKey in stored)) {
        throw new InternalErrorException(`${path}.${key} is not in its primitives`);
      }
      AggregateShape.assertMemberStored(`${path}.${key}`, member, stored[primitiveKey]);
    }
  }

  private static assertMemberStored(path: string, member: unknown, primitive: unknown): void {
    if (Array.isArray(member)) {
      member.forEach((item, index) =>
        AggregateShape.assertMemberStored(
          `${path}[${index}]`,
          item,
          Array.isArray(primitive) ? primitive[index] : undefined,
        ),
      );
      return;
    }
    if (typeof member === 'object' && member !== null && !(member instanceof AbstractType)) {
      AggregateShape.assertStored(path, member, primitive);
    }
  }

  private static assertPlain(aggregateName: string, path: string, value: unknown): void {
    if (value instanceof AbstractType) {
      throw new InternalErrorException(
        `${aggregateName}.toPrimitives() returns a value object at ${path}; return its value`,
      );
    }
    if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
      for (const [key, child] of Object.entries(value)) {
        AggregateShape.assertPlain(aggregateName, `${path}.${key}`, child);
      }
    }
  }

  private static primitiveKey(key: string): string {
    return key.startsWith('_') ? key.slice(1) : key;
  }

  private static describe(value: unknown): string {
    if (value instanceof Date) {
      return 'a Date';
    }
    return value === undefined ? 'undefined' : `a ${typeof value}`;
  }
}
