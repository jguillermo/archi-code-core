import { describe, expect, it } from 'vitest';
import { Criteria } from '@archi-code/criteria';
import {
  MongoCollection,
  MongoDriverOptions,
  MongoFindOptions,
  searchMongo,
} from '../../src/mongodb/search-mongo';
import { MongoFilter } from '../../src/mongodb/mongo-query';

interface User {
  id: string;
  age: number;
}

interface Call {
  method: 'find' | 'countDocuments';
  filter: MongoFilter;
  options: MongoFindOptions | MongoDriverOptions;
}

const NOT_A_LIST = { $not: { $type: 'array' } };

const ADULT = { age: { $gte: 18, ...NOT_A_LIST } };

function fakeCollection<D>(documents: D[], total = documents.length) {
  const calls: Call[] = [];
  const collection: MongoCollection<D> = {
    find: (filter, options) => {
      calls.push({ method: 'find', filter, options });
      return { toArray: async () => documents };
    },
    countDocuments: async (filter, options) => {
      calls.push({ method: 'countDocuments', filter, options });
      return total;
    },
  };
  return { collection, calls };
}

describe('searchMongo', () => {
  const criteria = Criteria.create<User>({
    where: { age: { gte: 18 } },
    orderBy: { age: 'desc' },
    limit: 2,
    offset: 4,
  });

  it('finds with the translated query, without _id', async () => {
    const { collection, calls } = fakeCollection<User>([{ id: 'a', age: 30 }]);
    expect(await searchMongo(collection, criteria)).toEqual({ items: [{ id: 'a', age: 30 }] });
    expect(calls).toEqual([
      {
        method: 'find',
        filter: ADULT,
        options: { sort: { age: -1 }, skip: 4, limit: 2, projection: { _id: 0 } },
      },
    ]);
  });

  it('counts the matches when asked for the total', async () => {
    const { collection, calls } = fakeCollection<User>([{ id: 'a', age: 30 }], 7);
    expect(await searchMongo(collection, criteria, { withTotal: true })).toEqual({
      items: [{ id: 'a', age: 30 }],
      total: 7,
    });
    expect(calls[1]).toEqual({ method: 'countDocuments', filter: ADULT, options: {} });
  });

  it('keeps _id when a field is stored in it and maps the documents', async () => {
    const { collection, calls } = fakeCollection<{ _id: string; age: number }>([
      { _id: 'a', age: 30 },
    ]);
    const result = await searchMongo<User, { _id: string; age: number }>(
      collection,
      Criteria.create<User>({ where: { id: 'a' } }),
      { fields: { id: '_id' }, map: ({ _id, age }) => ({ id: _id, age }) },
    );
    expect(result).toEqual({ items: [{ id: 'a', age: 30 }] });
    expect(calls[0].filter).toEqual({ _id: { $eq: 'a', ...NOT_A_LIST } });
    expect(calls[0].options).toEqual({ sort: {}, skip: 0, projection: {} });
  });

  it('uses the given projection', async () => {
    const { collection, calls } = fakeCollection<User>([]);
    await searchMongo(collection, Criteria.create<User>(), { projection: { age: 1 } });
    expect((calls[0].options as MongoFindOptions).projection).toEqual({ age: 1 });
  });

  it('passes the session, time limit, hint and comment to find and countDocuments', async () => {
    const { collection, calls } = fakeCollection<User>([], 0);
    const session = { id: 'session' };
    await searchMongo(collection, criteria, {
      withTotal: true,
      session,
      maxTimeMS: 500,
      hint: { age: -1 },
      comment: 'users search',
    });
    const driver = { session, maxTimeMS: 500, hint: { age: -1 }, comment: 'users search' };
    expect(calls[0].options).toEqual({
      ...driver,
      sort: { age: -1 },
      skip: 4,
      limit: 2,
      projection: { _id: 0 },
    });
    expect(calls[1].options).toEqual(driver);
  });

  it('never lets driver options replace the criteria order or pagination', async () => {
    const { collection, calls } = fakeCollection<User>([]);
    await searchMongo(collection, criteria, {
      maxTimeMS: undefined,
      ...({ sort: { id: 1 }, skip: 0, limit: 99 } as object),
    });
    expect(calls[0].options).toEqual({
      sort: { age: -1 },
      skip: 4,
      limit: 2,
      projection: { _id: 0 },
    });
  });
});
