import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Criteria } from '@archi-code/ddd/domain';
import type { CriteriaAggregate, SearchResult } from '@archi-code/ddd/domain';
import { AggregateRoot, NumberType, Required, StringType } from '@archi-code/ddd/domain';
import { runCriteriaContract } from '../contract/run-criteria-contract';
import type { ContractDocument, ContractRecord } from '../contract/contract-documents';
import { MongoClient, ObjectId } from 'mongodb';
import { MongoClient as MongoClientV6 } from 'mongodb-v6';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as os from 'node:os';
import { MongoCriteriaTranslator } from '../../src/mongodb/mongo-criteria-translator';
import type { MongoTranslatorOptions } from '../../src/mongodb/mongo-criteria-translator';

interface NativeCollection<D> {
  find(filter: object, options: object): { toArray(): Promise<D[]> };
  countDocuments(filter: object): Promise<number>;
}

async function runMongoQuery<A extends CriteriaAggregate, D, R>(
  collection: NativeCollection<D>,
  criteria: Criteria<A>,
  options: MongoTranslatorOptions<A> & { withTotal?: boolean; map: (document: D) => R },
): Promise<SearchResult<R>> {
  const { filter, sort, skip, limit } = new MongoCriteriaTranslator<A>(options).translate(criteria);
  const [documents, total] = await Promise.all([
    collection.find(filter, { sort, skip, limit }).toArray(),
    options.withTotal === true ? collection.countDocuments(filter) : undefined,
  ]);
  const items = documents.map(options.map);
  return total === undefined ? { items } : { items, total };
}

class AccountId extends Required(StringType) {}

class AccountAge extends Required(NumberType) {}

class Account extends AggregateRoot<AccountId> {
  constructor(
    id: AccountId,
    readonly age: AccountAge,
  ) {
    super(id);
  }

  toPrimitives(): { id: string; age: number } {
    return { id: this.id.value, age: this.age.value };
  }
}

class OrderId extends Required(StringType) {}

class OrderTotal extends Required(NumberType) {}

class Order extends AggregateRoot<OrderId> {
  constructor(
    id: OrderId,
    readonly total: OrderTotal,
  ) {
    super(id);
  }

  toPrimitives(): { id: string; total: number } {
    return { id: this.id.value, total: this.total.value };
  }
}

describe('MongoCriteriaTranslator on a real MongoDB', () => {
  let server: MongoMemoryServer;
  let client: MongoClient;
  let clientV6: MongoClientV6;

  beforeAll(async () => {
    server = await MongoMemoryServer.create();
    // Passing os keeps the driver from loading it with a dynamic import inside the test runner.
    client = await MongoClient.connect(server.getUri(), { runtimeAdapters: { os } });
    clientV6 = await MongoClientV6.connect(server.getUri());
  }, 300_000);

  afterAll(async () => {
    await client?.close();
    await clientV6?.close();
    await server?.stop();
  });

  it.each([
    ['7', () => client.db('criteria').collection<ContractDocument>('contract-v7')],
    ['6', () => clientV6.db('criteria').collection<ContractDocument>('contract-v6')],
  ])('passes the criteria contract with driver %s', async (_driver, collectionOf) => {
    const collection = collectionOf();
    const failures = await runCriteriaContract({
      setup: async (documents) => {
        await collection.deleteMany({});
        await collection.insertMany(documents);
      },
      search: (criteria, options) =>
        runMongoQuery<ContractRecord, ContractDocument, ContractDocument>(collection, criteria, {
          ...options,
          map: (document) => document,
        }),
    });
    expect(failures).toEqual([]);
  });

  it('stores the id in _id through a field map', async () => {
    const collection = client.db('criteria').collection<{ _id: string; age: number }>('users');
    await collection.insertMany([
      { _id: 'a', age: 30 },
      { _id: 'b', age: 15 },
    ]);
    const result = await runMongoQuery<Account, { _id: string; age: number }, Account>(
      collection,
      Criteria.create<Account>({
        where: { age: { gte: new AccountAge(18) } },
        orderBy: { id: 'asc' },
      }),
      {
        fields: { id: '_id' },
        map: ({ _id, age }) => new Account(new AccountId(_id), new AccountAge(age)),
        withTotal: true,
      },
    );
    expect(result.items.map((account) => account.toPrimitives())).toEqual([{ id: 'a', age: 30 }]);
    expect(result.total).toBe(1);
  });

  it('searches an ObjectId _id by its text through convert', async () => {
    const collection = client.db('criteria').collection<{ _id: ObjectId; total: number }>('orders');
    const first = new ObjectId();
    const second = new ObjectId();
    await collection.insertMany([
      { _id: first, total: 10 },
      { _id: second, total: 20 },
    ]);
    const options = {
      fields: { id: '_id' },
      convert: { id: (value: unknown) => new ObjectId(String(value)) },
      map: ({ _id, total }: { _id: ObjectId; total: number }) =>
        new Order(new OrderId(_id.toHexString()), new OrderTotal(total)).toPrimitives(),
    } as const;
    const byId = await runMongoQuery(
      collection,
      Criteria.create<Order>({ where: { id: new OrderId(first.toHexString()) } }),
      options,
    );
    const others = await runMongoQuery(
      collection,
      Criteria.create<Order>({ where: { id: { nin: [new OrderId(first.toHexString())] } } }),
      options,
    );
    expect(byId.items).toEqual([{ id: first.toHexString(), total: 10 }]);
    expect(others.items).toEqual([{ id: second.toHexString(), total: 20 }]);
    await expect(
      runMongoQuery(
        collection,
        Criteria.create<Order>({ where: { id: new OrderId('not-an-object-id') } }),
        options,
      ),
    ).rejects.toMatchObject({ name: 'CriteriaError', code: 'INVALID_VALUE' });
  });
});
