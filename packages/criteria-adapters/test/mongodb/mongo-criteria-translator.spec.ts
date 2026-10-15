import { describe, expect, it } from '@jest/globals';
import { Criteria, CriteriaError } from '@archi-code/criteria';
import { MongoCriteriaTranslator } from '../../src/mongodb/mongo-criteria-translator';

interface User {
  id: string;
  name: string;
  age?: number | null;
  createdAt: Date;
  tags: string[];
  address?: { city: string };
}

const translator = new MongoCriteriaTranslator<User>();

const NOT_A_LIST = { $not: { $type: 'array' } };

function filterOf(criteria: Criteria<User>) {
  return translator.translate(criteria).filter;
}

describe('MongoCriteriaTranslator', () => {
  it('translates an empty criteria', () => {
    expect(translator.translate(Criteria.create<User>())).toEqual({
      filter: {},
      sort: {},
      skip: 0,
    });
  });

  it('translates comparisons, ranges and lists', () => {
    const date = new Date(0);
    expect(
      filterOf(
        Criteria.create<User>({
          where: {
            id: 'x',
            name: { ne: 'y', gt: 'a', gte: 'b', lt: 'y', lte: 'z' },
            age: { between: [1, 9], in: [1, 2], nin: [3] },
            createdAt: date,
          },
        }),
      ),
    ).toEqual({
      $and: [
        { id: { $eq: 'x', ...NOT_A_LIST } },
        {
          $and: [
            { name: { $ne: 'y', ...NOT_A_LIST } },
            { name: { $gt: 'a', ...NOT_A_LIST } },
            { name: { $gte: 'b', ...NOT_A_LIST } },
            { name: { $lt: 'y', ...NOT_A_LIST } },
            { name: { $lte: 'z', ...NOT_A_LIST } },
          ],
        },
        {
          $and: [
            { age: { $gte: 1, $lte: 9, ...NOT_A_LIST } },
            { age: { $in: [1, 2], ...NOT_A_LIST } },
            { age: { $nin: [3], ...NOT_A_LIST } },
          ],
        },
        { createdAt: { $eq: date, ...NOT_A_LIST } },
      ],
    });
  });

  it('turns text operators into escaped, anchored regular expressions', () => {
    expect(
      filterOf(
        Criteria.create<User>({
          where: {
            name: { contains: 'a.b', startsWith: '(x', endsWith: '$', mode: 'insensitive' },
            'address.city': { contains: 'H' },
          },
        }),
      ),
    ).toEqual({
      $and: [
        {
          $and: [
            { name: { $regex: 'a\\.b', $options: 'i', ...NOT_A_LIST } },
            { name: { $regex: '^\\(x', $options: 'i', ...NOT_A_LIST } },
            { name: { $regex: '\\$\\z', $options: 'i', ...NOT_A_LIST } },
          ],
        },
        { $and: [{ address: NOT_A_LIST }, { 'address.city': { $regex: 'H', ...NOT_A_LIST } }] },
      ],
    });
  });

  it('translates nulls and lists', () => {
    expect(
      filterOf(
        Criteria.create<User>({
          where: {
            age: null,
            name: { isNull: false },
            tags: { has: 'a', hasEvery: ['b', 'c'], isEmpty: true },
            AND: [{ tags: { isEmpty: false } }],
          },
        }),
      ),
    ).toEqual({
      $and: [
        { age: { $eq: null, ...NOT_A_LIST } },
        { name: { $ne: null } },
        {
          $and: [
            { tags: { $type: 'array', $in: ['a'] } },
            { tags: { $type: 'array', $all: ['b', 'c'] } },
            { tags: { $size: 0 } },
          ],
        },
        { tags: { $type: 'array', $not: { $size: 0 } } },
      ],
    });
  });

  it('translates OR and NOT', () => {
    expect(
      filterOf(
        Criteria.create<User>({ where: { OR: [{ id: '1' }, { id: '2' }], NOT: { id: '3' } } }),
      ),
    ).toEqual({
      $and: [
        { $or: [{ id: { $eq: '1', ...NOT_A_LIST } }, { id: { $eq: '2', ...NOT_A_LIST } }] },
        { $nor: [{ id: { $eq: '3', ...NOT_A_LIST } }] },
      ],
    });
  });

  it('translates order and pagination', () => {
    expect(
      translator.translate(
        Criteria.create<User>({
          orderBy: [{ name: 'asc' }, { age: 'desc' }],
          limit: 10,
          offset: 20,
        }),
      ),
    ).toEqual({ filter: {}, sort: { name: 1, age: -1 }, skip: 20, limit: 10 });
    expect(translator.translate(Criteria.create<User>({ offset: 5 }))).toEqual({
      filter: {},
      sort: {},
      skip: 5,
    });
  });

  it('renames fields in filters and order', () => {
    const mapped = new MongoCriteriaTranslator<User>({
      fields: { id: '_id', 'address.city': 'addr.city' },
    });
    expect(
      mapped.translate(
        Criteria.create<User>({
          where: { id: '1', 'address.city': 'Huelva' },
          orderBy: { id: 'asc' },
        }),
      ),
    ).toEqual({
      filter: {
        $and: [
          { _id: { $eq: '1', ...NOT_A_LIST } },
          { $and: [{ addr: NOT_A_LIST }, { 'addr.city': { $eq: 'Huelva', ...NOT_A_LIST } }] },
        ],
      },
      sort: { _id: 1 },
      skip: 0,
    });
  });

  it('never reads a field across a list, like the in-memory adapter', () => {
    const paths = new MongoCriteriaTranslator<unknown>();
    const filter = (f: unknown[]) => paths.translate(Criteria.fromJSON({ v: 1, f })).filter;
    expect(filter(['eq', 'a.b.c', 1])).toEqual({
      $and: [{ a: NOT_A_LIST }, { 'a.b': NOT_A_LIST }, { 'a.b.c': { $eq: 1, ...NOT_A_LIST } }],
    });
    expect(filter(['eq', 'tags.0', 'x'])).toEqual({ 'tags.0': { $eq: 'x', ...NOT_A_LIST } });
    expect(filter(['eq', 'items.0.name', 'x'])).toEqual({
      $and: [{ 'items.0': NOT_A_LIST }, { 'items.0.name': { $eq: 'x', ...NOT_A_LIST } }],
    });
    expect(filter(['nu', 'a.b', 1])).toEqual({
      $or: [
        { a: { $type: 'array' } },
        { $and: [{ a: NOT_A_LIST }, { 'a.b': { $eq: null, ...NOT_A_LIST } }] },
      ],
    });
    expect(filter(['ne', 'a.b', 1])).toEqual({
      $or: [
        { a: { $type: 'array' } },
        { $and: [{ a: NOT_A_LIST }, { 'a.b': { $ne: 1, ...NOT_A_LIST } }] },
      ],
    });
    expect(filter(['nu', 'a.b', 0])).toEqual({
      $and: [{ a: NOT_A_LIST }, { 'a.b': { $ne: null } }],
    });
    expect(filter(['hs', 'a.tags', ['x']])).toEqual({
      $and: [{ a: NOT_A_LIST }, { 'a.tags': { $type: 'array', $in: ['x'] } }],
    });
  });

  it('converts values to their stored type, field by field', () => {
    const converting = new MongoCriteriaTranslator<User>({
      fields: { id: '_id' },
      convert: { id: (value) => `stored:${String(value)}`, age: (value) => Number(value) * 10 },
    });
    expect(
      converting.translateFilter(
        Criteria.create<User>({
          where: {
            id: { in: ['a'], ne: 'b' },
            age: { between: [1, 2], nin: [3] },
            tags: { has: 'x' },
            name: { contains: 'n' },
          },
        }).filter,
      ),
    ).toEqual({
      $and: [
        {
          $and: [
            { _id: { $in: ['stored:a'], ...NOT_A_LIST } },
            { _id: { $ne: 'stored:b', ...NOT_A_LIST } },
          ],
        },
        {
          $and: [
            { age: { $gte: 10, $lte: 20, ...NOT_A_LIST } },
            { age: { $nin: [30], ...NOT_A_LIST } },
          ],
        },
        { tags: { $type: 'array', $in: ['x'] } },
        { name: { $regex: 'n', ...NOT_A_LIST } },
      ],
    });
  });

  it('turns a converter error into a CriteriaError that keeps it as the cause', () => {
    const failure = new TypeError('not an id');
    const converting = new MongoCriteriaTranslator<User>({
      convert: {
        id: () => {
          throw failure;
        },
      },
    });
    const thrown = (criteria: Criteria<User>): unknown => {
      try {
        converting.translate(criteria);
      } catch (error) {
        return error;
      }
      return null;
    };
    const error = thrown(Criteria.create<User>({ where: { id: 'x' } }));
    expect(error).toBeInstanceOf(CriteriaError);
    expect(error).toMatchObject({
      code: 'INVALID_VALUE',
      message: 'Field "id" has a value it cannot store',
      cause: failure,
    });
    const long = 'n'.repeat(70);
    const longField = new MongoCriteriaTranslator<unknown>({
      convert: {
        [long]: () => {
          throw failure;
        },
      } as never,
    });
    expect(() => longField.translate(Criteria.fromJSON({ v: 1, f: ['eq', long, 'x'] }))).toThrow(
      `Field "${'n'.repeat(64)}…" has a value it cannot store`,
    );
  });

  it('translates a filter node on its own', () => {
    expect(translator.translateFilter(null)).toEqual({});
  });
});
