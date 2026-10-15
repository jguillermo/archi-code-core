'use strict';

const { Criteria, runCriteriaContract } = require('@archi-code/criteria');

function smoke(m) {
  return [
    [
      'searchMemory filters, sorts and paginates',
      () => {
        const items = [
          { id: 'a', age: 30 },
          { id: 'b', age: 15 },
          { id: 'c', age: 40 },
        ];
        const criteria = Criteria.create({
          where: { age: { gte: 18 } },
          orderBy: { age: 'desc' },
          limit: 1,
        });
        const result = m.searchMemory(items, criteria, { withTotal: true });
        return (
          JSON.stringify(result) === JSON.stringify({ items: [{ id: 'c', age: 40 }], total: 2 }) ||
          `unexpected result ${JSON.stringify(result)}`
        );
      },
    ],
    [
      'searchMemory passes the criteria contract',
      async () => {
        let documents = [];
        const failures = await runCriteriaContract({
          setup: (seed) => {
            documents = seed;
          },
          search: (criteria, options) => m.searchMemory(documents, criteria, options),
        });
        return failures.length === 0 || JSON.stringify(failures);
      },
    ],
  ];
}

module.exports = { smoke };
