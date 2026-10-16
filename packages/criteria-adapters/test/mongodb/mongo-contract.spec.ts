import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Criteria } from '@archi-code/criteria';
import { runCriteriaContract } from '../contract/run-criteria-contract';
import type { ContractDocument } from '../contract/contract-documents';
import { MongoClient, ObjectId } from 'mongodb';
import { MongoClient as MongoClientV6 } from 'mongodb-v6';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as os from 'node:os';
import { searchMongo } from '../../src/mongodb/search-mongo';

describe('searchMongo on a real MongoDB', () => {
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
      search: (criteria, options) => searchMongo<ContractDocument>(collection, criteria, options),
    });
    expect(failures).toEqual([]);
  });

  it('stores the id in _id through a field map', async () => {
    interface User {
      id: string;
      age: number;
    }
    const collection = client.db('criteria').collection<{ _id: string; age: number }>('users');
    await collection.insertMany([
      { _id: 'a', age: 30 },
      { _id: 'b', age: 15 },
    ]);
    const result = await searchMongo<User, { _id: string; age: number }>(
      collection,
      Criteria.create<User>({ where: { age: { gte: 18 } }, orderBy: { id: 'asc' } }),
      { fields: { id: '_id' }, map: ({ _id, age }) => ({ id: _id, age }), withTotal: true },
    );
    expect(result).toEqual({ items: [{ id: 'a', age: 30 }], total: 1 });
  });

  it('searches an ObjectId _id by its text through convert', async () => {
    interface Order {
      id: string;
      total: number;
    }
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
      map: ({ _id, total }: { _id: ObjectId; total: number }) => ({ id: _id.toHexString(), total }),
    } as const;
    const byId = await searchMongo<Order, { _id: ObjectId; total: number }>(
      collection,
      Criteria.create<Order>({ where: { id: first.toHexString() } }),
      options,
    );
    const others = await searchMongo<Order, { _id: ObjectId; total: number }>(
      collection,
      Criteria.create<Order>({ where: { id: { nin: [first.toHexString()] } } }),
      options,
    );
    expect(byId.items).toEqual([{ id: first.toHexString(), total: 10 }]);
    expect(others.items).toEqual([{ id: second.toHexString(), total: 20 }]);
    await expect(
      searchMongo<Order, { _id: ObjectId; total: number }>(
        collection,
        Criteria.create<Order>({ where: { id: 'not-an-object-id' } }),
        options,
      ),
    ).rejects.toMatchObject({ name: 'CriteriaError', code: 'INVALID_VALUE' });
  });
});
