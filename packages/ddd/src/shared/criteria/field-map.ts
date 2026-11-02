import { Path } from './path';

export type FieldMap<T> = Readonly<Partial<Record<Path<T>, string>>>;

export function mapField(fields: FieldMap<any> | undefined, field: string): string {
  const mapped: unknown =
    fields !== undefined && Object.prototype.hasOwnProperty.call(fields, field)
      ? (fields as Record<string, unknown>)[field]
      : undefined;
  return typeof mapped === 'string' ? mapped : field;
}
