import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { Criteria, runCriteriaContract } from '@archi-code/criteria';
import type { ContractDocument } from '@archi-code/criteria';
import { Collection, MongoClient } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { searchMongo } from '../../src/search-mongo';

describe('searchMongo on a real MongoDB', () => {
  let server: MongoMemoryServer;
  let client: MongoClient;

  beforeAll(async () => {
    server = await MongoMemoryServer.create();
    client = await MongoClient.connect(server.getUri());
  }, 300_000);

  afterAll(async () => {
    await client?.close();
    await server?.stop();
  });

  it('passes the criteria contract', async () => {
    const collection: Collection<ContractDocument> = client.db('criteria').collection('contract');
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
});
