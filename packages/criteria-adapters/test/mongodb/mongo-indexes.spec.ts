import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Criteria } from '@archi-code/criteria';
import { Collection, Document, MongoClient } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as os from 'node:os';
import { MongoCriteriaTranslator } from '../../src/mongodb/mongo-criteria-translator';

interface Account {
  id: string;
  status: string;
  age: number;
  deletedAt: Date | null;
  address: { city: string };
}

const ACCOUNTS = 2000;

function winningStages(plan: Document | undefined): string[] {
  if (plan === undefined) return [];
  const children = [plan.inputStage, ...(plan.inputStages ?? [])] as (Document | undefined)[];
  return [plan.stage as string, ...children.flatMap(winningStages)];
}

describe('MongoCriteriaTranslator keeps indexes usable', () => {
  let server: MongoMemoryServer;
  let client: MongoClient;
  let accounts: Collection;

  beforeAll(async () => {
    server = await MongoMemoryServer.create();
    // Passing os keeps the driver from loading it with a dynamic import inside the test runner.
    client = await MongoClient.connect(server.getUri(), { runtimeAdapters: { os } });
    accounts = client.db('criteria').collection('accounts');
    await accounts.insertMany(
      Array.from({ length: ACCOUNTS }, (_, index) => ({
        id: `a${index}`,
        status: index % 50 === 0 ? 'blocked' : 'active',
        age: index % 90,
        deletedAt: index % 100 === 0 ? new Date(index) : null,
        address: { city: index % 2 === 0 ? 'Huelva' : 'Sevilla' },
      })),
    );
    await accounts.createIndexes([
      { key: { status: 1 } },
      { key: { age: 1 } },
      { key: { deletedAt: 1 } },
      { key: { 'address.city': 1 } },
    ]);
  }, 300_000);

  afterAll(async () => {
    await client?.close();
    await server?.stop();
  });

  it.each<[string, Criteria<Account>, number]>([
    ['eq', Criteria.create<Account>({ where: { status: 'blocked' } }), 40],
    ['ne', Criteria.create<Account>({ where: { status: { ne: 'active' } } }), 40],
    ['nin', Criteria.create<Account>({ where: { status: { nin: ['active'] } } }), 40],
    ['a range', Criteria.create<Account>({ where: { age: { gte: 10, lt: 12 } } }), 46],
    ['isNull: false', Criteria.create<Account>({ where: { deletedAt: { isNull: false } } }), 20],
    ['a dotted path', Criteria.create<Account>({ where: { 'address.city': 'Huelva' } }), 1000],
  ])('%s reads only the matching documents through an index', async (_name, criteria, count) => {
    const filter = new MongoCriteriaTranslator<Account>().translateFilter(criteria.filter);
    const explained = await accounts.find(filter).explain('executionStats');
    expect(winningStages(explained.queryPlanner.winningPlan)).toContain('IXSCAN');
    expect(explained.executionStats.nReturned).toBe(count);
    expect(explained.executionStats.totalDocsExamined).toBe(count);
  });
});
