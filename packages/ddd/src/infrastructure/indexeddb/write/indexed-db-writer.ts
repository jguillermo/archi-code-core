import { ConcurrencyException } from '../../../application/index';
import { IndexedDbException } from '../../exceptions/indexed-db.exception';
import type { IndexedDbSchema } from '../indexed-db-schema';
import { IndexedDbRequest } from '../transaction/indexed-db-request';

export class IndexedDbWriter {
  private readonly context: string;

  constructor(private readonly schema: IndexedDbSchema<any, any>) {
    this.context = `a write on table "${schema.name}" failed`;
  }

  async persist(store: IDBObjectStore, row: any, checked: boolean): Promise<void> {
    const id: unknown = row?.id;
    if (typeof id !== 'string' || id === '') {
      throw new IndexedDbException(
        'invalid_key',
        `a row of table "${this.schema.name}" needs a non-empty text id`,
      );
    }
    const stored = await IndexedDbRequest.result<any>(() => store.get(id), this.context);
    if (checked) {
      this.assertRowVersion(
        id,
        IndexedDbWriter.isRowVersion(row.rowVersion) ? row.rowVersion : 0,
        stored?.rowVersion ?? 0,
      );
    }
    const completed = this.schema.complete(row, stored ?? null);
    const rowVersion = (stored?.rowVersion ?? 0) + 1;
    await IndexedDbRequest.result(() => store.put({ ...completed, rowVersion }), this.context);
  }

  async remove(store: IDBObjectStore, id: string, rowVersion?: number | null): Promise<void> {
    if (IndexedDbWriter.isRowVersion(rowVersion)) {
      const stored = await IndexedDbRequest.result<any>(() => store.get(id), this.context);
      if (stored !== undefined) {
        this.assertRowVersion(id, rowVersion, stored.rowVersion);
      }
    }
    await IndexedDbRequest.result(() => store.delete(id), this.context);
  }

  private assertRowVersion(id: string, expected: number, stored: number): void {
    if (expected !== stored) {
      throw new ConcurrencyException(this.schema.name, id, expected);
    }
  }

  async clear(store: IDBObjectStore): Promise<void> {
    await IndexedDbRequest.result(() => store.clear(), this.context);
  }

  private static isRowVersion(value: unknown): value is number {
    return Number.isSafeInteger(value) && (value as number) >= 1;
  }
}
