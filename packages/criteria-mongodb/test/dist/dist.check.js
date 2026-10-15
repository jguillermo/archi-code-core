'use strict';

const { Criteria } = require('@archi-code/criteria');

function smoke(m) {
  return [
    [
      'MongoCriteriaTranslator translates filters, order and pagination',
      () => {
        const query = new m.MongoCriteriaTranslator({ fields: { id: '_id' } }).translate(
          Criteria.create({
            where: { id: 'a', name: { startsWith: 'a.b', mode: 'insensitive' } },
            orderBy: { id: 'desc' },
            limit: 5,
          }),
        );
        const expected = {
          filter: {
            $and: [{ _id: { $eq: 'a' } }, { name: { $regex: '^a\\.b', $options: 'i' } }],
          },
          sort: { _id: -1 },
          skip: 0,
          limit: 5,
        };
        return (
          JSON.stringify(query) === JSON.stringify(expected) ||
          `unexpected query ${JSON.stringify(query)}`
        );
      },
    ],
    [
      'searchMongo runs the query on a collection and counts',
      async () => {
        const calls = [];
        const collection = {
          find: (filter, options) => {
            calls.push({ filter, options });
            return { toArray: async () => [{ id: 'a', age: 30 }] };
          },
          countDocuments: async () => 3,
        };
        const result = await m.searchMongo(
          collection,
          Criteria.create({ where: { age: { gt: 18 } } }),
          { withTotal: true },
        );
        return (
          (result.total === 3 &&
            result.items[0].id === 'a' &&
            JSON.stringify(calls[0].filter) === JSON.stringify({ age: { $gt: 18 } }) &&
            calls[0].options.projection._id === 0) ||
          `unexpected result ${JSON.stringify(result)} ${JSON.stringify(calls)}`
        );
      },
    ],
  ];
}

module.exports = { smoke };
