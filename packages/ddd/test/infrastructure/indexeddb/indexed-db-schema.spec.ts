import { describe, expect, expectTypeOf, it } from 'vitest';
import { IndexedDbException } from '../../../src/infrastructure/exceptions/indexed-db.exception';
import { IndexedDbSchema } from '../../../src/infrastructure/indexeddb/indexed-db-schema';
import type { IndexedDbStored } from '../../../src/infrastructure/indexeddb/indexed-db-schema';

interface OrderRow {
  readonly id: string;
  readonly customerId: string;
  readonly status?: string;
  readonly tags?: string[];
}

interface OrderStored extends OrderRow {
  readonly status: string;
  readonly tags: string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

class OrderSchema extends IndexedDbSchema<OrderRow, OrderStored> {
  constructor(clock: () => string = () => '2026-11-17T10:00:00.000Z') {
    super({
      name: 'orders',
      indexes: {
        byCustomer: 'customerId',
        byCustomerAndStatus: ['customerId', 'status'],
        byTag: { keyPath: 'tags', multiEntry: true },
      },
      defaults: { status: 'pending', tags: () => [] },
      audit: {
        createdAt: { onInsert: clock },
        updatedAt: { onInsert: clock, onUpdate: (row, stored) => `${stored.createdAt}+${row.id}` },
      },
    });
  }
}

const stored = (row: Partial<OrderStored> = {}): IndexedDbStored<OrderStored> => ({
  id: 'ord-1',
  customerId: 'cus-1',
  status: 'paid',
  tags: ['gift'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  rowVersion: 4,
  ...row,
});

const invalidSchema = { reason: 'invalid_schema' };

describe('IndexedDbSchema: the declaration of one table', () => {
  it('declares the name and the indexes of the table, each with every option', () => {
    const schema = new OrderSchema();

    expect(schema.name).toBe('orders');
    expect(Array.from(schema.indexes)).toStrictEqual([
      ['byCustomer', { keyPath: 'customerId', unique: false, multiEntry: false }],
      [
        'byCustomerAndStatus',
        { keyPath: ['customerId', 'status'], unique: false, multiEntry: false },
      ],
      ['byTag', { keyPath: 'tags', unique: false, multiEntry: true }],
    ]);
  });

  it('needs nothing but a name', () => {
    const schema = new IndexedDbSchema<{ id: string }>({ name: 'outbox' });

    expect(schema.indexes.size).toBe(0);
    expect(schema.complete({ id: 'evt-1' }, null)).toStrictEqual({ id: 'evt-1' });
  });

  it('has the same signature as another schema declared the same way, and another one otherwise', () => {
    const unique = new IndexedDbSchema<OrderRow>({
      name: 'orders',
      indexes: { byCustomer: { keyPath: 'customerId', unique: true } },
    });
    const plain = new IndexedDbSchema<OrderRow>({
      name: 'orders',
      indexes: { byCustomer: 'customerId' },
    });

    expect(new OrderSchema().signature).toBe(new OrderSchema().signature);
    expect(unique.signature).not.toBe(plain.signature);
  });

  describe('completing a new row', () => {
    it('fills the defaults a row does not bring and stamps the audit fields', () => {
      const schema = new OrderSchema();

      expect(schema.complete({ id: 'ord-1', customerId: 'cus-1' }, null)).toStrictEqual({
        id: 'ord-1',
        customerId: 'cus-1',
        status: 'pending',
        tags: [],
        createdAt: '2026-11-17T10:00:00.000Z',
        updatedAt: '2026-11-17T10:00:00.000Z',
      });
    });

    it('keeps the values the row brings instead of the defaults', () => {
      const completed = new OrderSchema().complete(
        { id: 'ord-1', customerId: 'cus-1', status: 'paid', tags: ['gift'] },
        null,
      );

      expect(completed).toMatchObject({ status: 'paid', tags: ['gift'] });
    });

    it('never keeps the rowVersion of the row: the table owns it', () => {
      const completed = new OrderSchema().complete(
        { id: 'ord-1', customerId: 'cus-1', rowVersion: 9 },
        null,
      );

      expect('rowVersion' in completed).toBe(false);
    });

    it('ignores an audit value sent by the caller', () => {
      const row = { id: 'ord-1', customerId: 'cus-1', createdAt: '1999-01-01T00:00:00.000Z' };

      expect(new OrderSchema().complete(row, null).createdAt).toBe('2026-11-17T10:00:00.000Z');
    });
  });

  describe('completing a row that is already stored', () => {
    it('keeps the stored value of an audit field without onUpdate and recomputes the others', () => {
      const completed = new OrderSchema().complete(
        { id: 'ord-1', customerId: 'cus-2', createdAt: 'ignored' } as OrderRow,
        stored(),
      );

      expect(completed).toStrictEqual({
        id: 'ord-1',
        customerId: 'cus-2',
        status: 'pending',
        tags: [],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z+ord-1',
      });
    });
  });

  describe('values that are not ready when the row is saved', () => {
    const later = (): never => Promise.resolve('later') as never;

    it('refuses a default computed asynchronously', () => {
      const schema = new IndexedDbSchema<OrderRow, OrderStored>({
        name: 'orders',
        defaults: { status: later },
      });

      expect(() => schema.complete({ id: 'ord-1', customerId: 'cus-1' }, null)).toThrow(
        'IndexedDB invalid_schema: table "orders": field "status" received a promise: default and audit values are computed synchronously',
      );
    });

    it('refuses an audit value computed asynchronously, on insert and on update', () => {
      const schema = new IndexedDbSchema<OrderRow, OrderStored>({
        name: 'orders',
        audit: {
          createdAt: { onInsert: later },
          updatedAt: { onInsert: () => 'now', onUpdate: later },
        },
      });
      const row = { id: 'ord-1', customerId: 'cus-1' };

      expect(() => schema.complete(row, null)).toThrow(IndexedDbException);
      expect(() => schema.complete(row, stored())).toThrow(/field "updatedAt" received a promise/);
    });

    it('accepts an empty default', () => {
      const schema = new IndexedDbSchema<{ id: string; note?: string | null }>({
        name: 'notes',
        defaults: { note: null },
      });

      expect(schema.complete({ id: 'note-1' }, null)).toStrictEqual({ id: 'note-1', note: null });
    });
  });

  describe('a declaration that cannot work', () => {
    it.each([[''], [42], ['@archi-code/database']])('refuses the table name %j', (name) => {
      expect(() => new IndexedDbSchema({ name: name as string })).toThrow(
        expect.objectContaining(invalidSchema),
      );
    });

    it.each([
      ['an index without a name', { '': 'customerId' }],
      ['a key path that is not text', { byCustomer: { keyPath: 7 } }],
      ['an empty key path', { byCustomer: '' }],
      ['an empty list of fields', { byCustomer: [] }],
      ['a list with an empty field', { byCustomer: ['customerId', ''] }],
      [
        'a multiEntry index over several fields',
        { byTag: { keyPath: ['tags', 'id'], multiEntry: true } },
      ],
    ])('refuses %s', (_case, indexes) => {
      expect(() => new IndexedDbSchema({ name: 'orders', indexes: indexes as never })).toThrow(
        expect.objectContaining(invalidSchema),
      );
    });

    it.each(['id', 'rowVersion'])('refuses a default or an audit value for %s', (field) => {
      expect(
        () => new IndexedDbSchema({ name: 'orders', defaults: { [field]: 'x' } as never }),
      ).toThrow(/belongs to the table/);
      expect(
        () =>
          new IndexedDbSchema({
            name: 'orders',
            audit: { [field]: { onInsert: () => 'x' } } as never,
          }),
      ).toThrow(/belongs to the table/);
    });

    it('refuses a field declared both as a default and as an audit value', () => {
      expect(
        () =>
          new IndexedDbSchema<OrderRow, OrderStored>({
            name: 'orders',
            defaults: { status: 'pending' },
            audit: { status: { onInsert: () => 'pending' } },
          }),
      ).toThrow(/declared both in defaults and in audit/);
    });

    it.each([
      ['no onInsert', {}],
      ['an onInsert that is not a function', { onInsert: 'now' }],
      ['an onUpdate that is not a function', { onInsert: () => 'now', onUpdate: 'now' }],
    ])('refuses an audit field with %s', (_case, field) => {
      expect(
        () => new IndexedDbSchema({ name: 'orders', audit: { createdAt: field } as never }),
      ).toThrow(/needs an onInsert function/);
    });
  });

  it('types what goes in, what comes out and the fields a schema may fill', () => {
    const schema = new OrderSchema();

    expectTypeOf(schema.complete).parameter(0).toMatchTypeOf<OrderRow>();
    expectTypeOf(schema.complete).returns.toEqualTypeOf<OrderStored>();
  });
});
