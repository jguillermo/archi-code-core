'use strict';

const ddd = require('@archi-code/ddd/domain');

const { Criteria } = ddd;

class ItemId extends ddd.Required(ddd.StringType) {}
class Age extends ddd.NumberType {}
class Name extends ddd.StringType {}

class Item extends ddd.AggregateRoot {
  constructor(id, age, name) {
    super(new ItemId(id));
    this.age = new Age(age ?? null);
    this.name = new Name(name ?? null);
  }

  toPrimitives() {
    return { id: this.id.value, age: this.age.value, name: this.name.value };
  }
}

function smoke(m) {
  return [
    [
      'searchMemory filters, sorts and paginates aggregates',
      () => {
        const items = [new Item('a', 30), new Item('b', 15), new Item('c', 40)];
        const criteria = Criteria.create({
          where: { age: { gte: new Age(18) } },
          orderBy: { age: 'desc' },
          limit: 1,
        });
        const result = m.searchMemory(items, criteria, { withTotal: true });
        return (
          (result.items.length === 1 && result.items[0] === items[2] && result.total === 2) ||
          `unexpected result ${JSON.stringify(result.items.map((item) => item.toPrimitives()))}`
        );
      },
    ],
    [
      'searchMemory orders text by code point and folds case like the other adapters',
      () => {
        const items = [
          new Item('astral', null, '\u{1F600}'),
          new Item('halfwidth', null, '\uFF71'),
          new Item('omega', null, '\u03C9mega'),
          new Item('missing'),
        ];
        const ordered = m
          .searchMemory(items, Criteria.create({ orderBy: { name: 'asc' } }))
          .items.map((item) => item.id.value);
        const folded = m
          .searchMemory(
            items,
            Criteria.create({ where: { name: { startsWith: '\u03A9', mode: 'insensitive' } } }),
          )
          .items.map((item) => item.id.value);
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
  const { ContractRecord } = await import(new URL('/test/contract/contract-documents', entry).href);
  let records = [];
  const failures = await runCriteriaContract({
    setup: (documents) => {
      records = documents.map((document) => ContractRecord.fromPrimitives(document));
    },
    search: (criteria, options) => {
      const result = m.searchMemory(records, criteria, options);
      return { ...result, items: result.items.map((record) => record.toPrimitives()) };
    },
  });
  return failures.length === 0 || JSON.stringify(failures);
}

function browser() {
  return [['searchMemory passes the criteria contract in the page', contractInThePage]];
}

module.exports = { smoke, browser };
