import { IndexedDbException } from '../exceptions/indexed-db.exception';

export interface IndexedDbRow {
  readonly id: string;
}

export type IndexedDbStored<Stored> = Stored & { readonly rowVersion: number };

export type IndexedDbInput<Row> = Row & { readonly rowVersion?: number | null };

export interface IndexedDbIndexOptions {
  readonly keyPath: string | readonly string[];
  readonly unique?: boolean;
  readonly multiEntry?: boolean;
}

export type IndexedDbIndex = string | readonly string[] | IndexedDbIndexOptions;

export interface IndexedDbIndexDefinition {
  readonly keyPath: string | readonly string[];
  readonly unique: boolean;
  readonly multiEntry: boolean;
}

export type IndexedDbField<Stored> = Exclude<keyof Stored & string, 'id' | 'rowVersion'>;

export type IndexedDbDefaults<Stored> = {
  readonly [Field in IndexedDbField<Stored>]?: Stored[Field] | (() => Stored[Field]);
};

export interface IndexedDbAuditField<Row, Stored, Value> {
  readonly onInsert: (row: Row) => Value;
  readonly onUpdate?: (row: Row, stored: IndexedDbStored<Stored>) => Value;
}

export type IndexedDbAudit<Row, Stored> = {
  readonly [Field in IndexedDbField<Stored>]?: IndexedDbAuditField<Row, Stored, Stored[Field]>;
};

export interface IndexedDbSchemaOptions<Row, Stored> {
  readonly name: string;
  readonly indexes?: Readonly<Record<string, IndexedDbIndex>>;
  readonly defaults?: IndexedDbDefaults<Stored>;
  readonly audit?: IndexedDbAudit<Row, Stored>;
}

export class IndexedDbSchema<Row extends IndexedDbRow, Stored extends Row = Row> {
  static readonly reservedPrefix = '@archi-code/';
  private static readonly reservedFields: readonly string[] = ['id', 'rowVersion'];

  readonly name: string;
  readonly indexes: ReadonlyMap<string, IndexedDbIndexDefinition>;
  readonly signature: string;
  private readonly defaults: readonly (readonly [string, unknown])[];
  private readonly audit: readonly (readonly [string, IndexedDbAuditField<Row, Stored, unknown>])[];

  constructor({
    name,
    indexes = {},
    defaults = {},
    audit = {},
  }: IndexedDbSchemaOptions<Row, Stored>) {
    if (
      typeof name !== 'string' ||
      name === '' ||
      name.startsWith(IndexedDbSchema.reservedPrefix)
    ) {
      throw new IndexedDbException(
        'invalid_schema',
        `a table needs a non-empty name that does not start with "${IndexedDbSchema.reservedPrefix}", received "${String(name)}"`,
      );
    }
    this.name = name;
    this.indexes = new Map(
      Object.entries(indexes).map(([index, declared]) => [index, this.indexOf(index, declared)]),
    );
    this.defaults = Object.entries(defaults);
    this.audit = Object.entries(audit) as [string, IndexedDbAuditField<Row, Stored, unknown>][];
    for (const [field] of this.defaults) {
      this.assertFree(field);
    }
    for (const [field, { onInsert, onUpdate }] of this.audit) {
      this.assertFree(field);
      if (this.defaults.some(([other]) => other === field)) {
        throw this.invalid(`field "${field}" is declared both in defaults and in audit`);
      }
      if (
        typeof onInsert !== 'function' ||
        (onUpdate !== undefined && typeof onUpdate !== 'function')
      ) {
        throw this.invalid(
          `audit field "${field}" needs an onInsert function and, when given, an onUpdate function`,
        );
      }
    }
    this.signature = JSON.stringify([
      name,
      Array.from(this.indexes),
      this.defaults.map(([field]) => field),
      this.audit.map(([field, { onUpdate }]) => [field, onUpdate !== undefined]),
    ]);
  }

  complete(row: IndexedDbInput<Row>, stored: IndexedDbStored<Stored> | null): Stored {
    const completed = { ...row } as unknown as Record<string, unknown>;
    delete completed.rowVersion;
    for (const [field, value] of this.defaults) {
      if (completed[field] === undefined) {
        completed[field] = this.settled(field, typeof value === 'function' ? value() : value);
      }
    }
    for (const [field, { onInsert, onUpdate }] of this.audit) {
      if (stored === null) {
        completed[field] = this.settled(field, onInsert(row));
      } else if (onUpdate === undefined) {
        completed[field] = (stored as unknown as Record<string, unknown>)[field];
      } else {
        completed[field] = this.settled(field, onUpdate(row, stored));
      }
    }
    return completed as Stored;
  }

  private indexOf(index: string, declared: IndexedDbIndex): IndexedDbIndexDefinition {
    const options: IndexedDbIndexOptions =
      typeof declared === 'string' || Array.isArray(declared)
        ? { keyPath: declared as string | readonly string[] }
        : (declared as IndexedDbIndexOptions);
    const { unique = false, multiEntry = false } = options;
    const parts = typeof options.keyPath === 'string' ? [options.keyPath] : options.keyPath;
    const valid =
      index !== '' &&
      Array.isArray(parts) &&
      parts.length > 0 &&
      parts.every((part) => typeof part === 'string' && part !== '') &&
      !(multiEntry && typeof options.keyPath !== 'string');
    if (!valid) {
      throw this.invalid(
        `index "${index}" needs a name and a key path of one field or a list of fields (one field when it is multiEntry)`,
      );
    }
    const keyPath = typeof options.keyPath === 'string' ? options.keyPath : [...options.keyPath];
    return { keyPath, unique, multiEntry };
  }

  private assertFree(field: string): void {
    if (IndexedDbSchema.reservedFields.includes(field)) {
      throw this.invalid(
        `field "${field}" belongs to the table: it takes no default nor audit value`,
      );
    }
  }

  private settled(field: string, value: unknown): unknown {
    if (typeof (value as { then?: unknown } | null | undefined)?.then === 'function') {
      throw this.invalid(
        `field "${field}" received a promise: default and audit values are computed synchronously`,
      );
    }
    return value;
  }

  private invalid(message: string): IndexedDbException {
    return new IndexedDbException('invalid_schema', `table "${this.name}": ${message}`);
  }
}
