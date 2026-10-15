'use strict';

const { Criteria } = require('@archi-code/criteria');

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
      'searchMemory orders text by code point and folds case like the other adapters',
      () => {
        const items = [
          { id: 'astral', name: '\u{1F600}' },
          { id: 'halfwidth', name: '\uFF71' },
          { id: 'omega', name: '\u03C9mega' },
          { id: 'missing' },
        ];
        const ordered = m
          .searchMemory(items, Criteria.create({ orderBy: { name: 'asc' } }))
          .items.map((item) => item.id);
        const folded = m
          .searchMemory(
            items,
            Criteria.create({ where: { name: { startsWith: '\u03A9', mode: 'insensitive' } } }),
          )
          .items.map((item) => item.id);
        return (
          (ordered.join() === 'missing,omega,halfwidth,astral' && folded.join() === 'omega') ||
          `unexpected ${ordered} / ${folded}`
        );
      },
    ],
  ];
}

async function contractInThePage(entry) {
  const m = await import(entry);
  const { runCriteriaContract } = await import(
    new URL('/test/contract/run-criteria-contract', entry).href
  );
  let documents = [];
  const failures = await runCriteriaContract({
    setup: (seed) => {
      documents = seed;
    },
    search: (criteria, options) => m.searchMemory(documents, criteria, options),
  });
  return failures.length === 0 || JSON.stringify(failures);
}

function browser() {
  return [['searchMemory passes the criteria contract in the page', contractInThePage]];
}

module.exports = { smoke, browser };
