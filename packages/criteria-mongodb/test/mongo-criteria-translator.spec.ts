import { describe, expect, it } from '@jest/globals';
import { Criteria } from '@archi-code/criteria';
import { MongoCriteriaTranslator } from '../src/mongo-criteria-translator';

interface User {
  id: string;
  name: string;
  age?: number | null;
  createdAt: Date;
  tags: string[];
  address?: { city: string };
}

const translator = new MongoCriteriaTranslator<User>();

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
        { id: { $eq: 'x' } },
        {
          $and: [
            { name: { $ne: 'y' } },
            { name: { $gt: 'a' } },
            { name: { $gte: 'b' } },
            { name: { $lt: 'y' } },
            { name: { $lte: 'z' } },
          ],
        },
        {
          $and: [{ age: { $gte: 1, $lte: 9 } }, { age: { $in: [1, 2] } }, { age: { $nin: [3] } }],
        },
        { createdAt: { $eq: date } },
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
            { name: { $regex: 'a\\.b', $options: 'i' } },
            { name: { $regex: '^\\(x', $options: 'i' } },
            { name: { $regex: '\\$\\z', $options: 'i' } },
          ],
        },
        { 'address.city': { $regex: 'H' } },
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
        { age: { $eq: null } },
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
        { $or: [{ id: { $eq: '1' } }, { id: { $eq: '2' } }] },
        { $nor: [{ id: { $eq: '3' } }] },
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
      filter: { $and: [{ _id: { $eq: '1' } }, { 'addr.city': { $eq: 'Huelva' } }] },
      sort: { _id: 1 },
      skip: 0,
    });
  });

  it('translates a filter node on its own', () => {
    expect(translator.translateFilter(null)).toEqual({});
  });
});
