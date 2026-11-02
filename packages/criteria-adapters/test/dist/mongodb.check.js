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
            $and: [
              { _id: { $eq: 'a', $not: { $type: 'array' } } },
              { name: { $regex: '^a\\.b', $options: 'i', $not: { $type: 'array' } } },
            ],
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
      'MongoCriteriaTranslator converts values and reports the ones it cannot store',
      () => {
        const translator = new m.MongoCriteriaTranslator({
          convert: {
            age: (value) => {
              if (value < 0) throw new Error('negative');
              return String(value);
            },
          },
        });
        const filter = translator.translateFilter(Criteria.create({ where: { age: 7 } }).filter);
        let code = null;
        try {
          translator.translate(Criteria.create({ where: { age: -1 } }));
        } catch (error) {
          code = error.code;
        }
        return (
          (filter.age.$eq === '7' && code === 'INVALID_VALUE') ||
          `unexpected ${JSON.stringify(filter)} / ${code}`
        );
      },
    ],
  ];
}

module.exports = { smoke };
