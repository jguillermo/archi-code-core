import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Criteria } from '@archi-code/criteria';
import { MongoClient } from 'mongodb';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import * as os from 'node:os';
import { searchMongo } from '../../src/mongodb/search-mongo';

interface Order {
  id: string;
  status: string;
}

describe('searchMongo inside a transaction', () => {
  let replicaSet: MongoMemoryReplSet;
  let client: MongoClient;

  beforeAll(async () => {
    replicaSet = await MongoMemoryReplSet.create({
      replSet: { count: 1 },
      instanceOpts: [{ args: ['--setParameter', 'enableTestCommands=1'] }],
    });
    // Passing os keeps the driver from loading it with a dynamic import inside the test runner.
    client = await MongoClient.connect(replicaSet.getUri(), { runtimeAdapters: { os } });
  }, 300_000);

  afterAll(async () => {
    await client?.close();
    await replicaSet?.stop();
  });

  it('sees what the transaction wrote only when it gets the session', async () => {
    const orders = client.db('shop').collection<Order>('orders');
    await orders.insertOne({ id: 'o1', status: 'paid' });
    const paid = Criteria.create<Order>({ where: { status: 'paid' }, orderBy: { id: 'asc' } });
    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        await orders.insertOne({ id: 'o2', status: 'paid' }, { session });
        const inside = await searchMongo(orders, paid, { session, withTotal: true });
        const outside = await searchMongo(orders, paid, { withTotal: true });
        expect(inside).toEqual({
          items: [
            { id: 'o1', status: 'paid' },
            { id: 'o2', status: 'paid' },
          ],
          total: 2,
        });
        expect(outside).toEqual({ items: [{ id: 'o1', status: 'paid' }], total: 1 });
      });
    } finally {
      await session.endSession();
    }
  });

  it('stops a query that runs longer than maxTimeMS', async () => {
    const orders = client.db('shop').collection<Order>('slow');
    await orders.insertMany(
      Array.from({ length: 50 }, (_, index) => ({ id: `s${index}`, status: 'x' })),
    );
    await client.db('admin').command({
      configureFailPoint: 'maxTimeAlwaysTimeOut',
      mode: 'alwaysOn',
    });
    try {
      await expect(
        searchMongo(orders, Criteria.create<Order>({ where: { status: 'x' } }), { maxTimeMS: 1 }),
      ).rejects.toThrow(/time limit|MaxTimeMSExpired|exceeded/i);
    } finally {
      await client.db('admin').command({ configureFailPoint: 'maxTimeAlwaysTimeOut', mode: 'off' });
    }
  });
});
