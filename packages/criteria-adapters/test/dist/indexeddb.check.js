'use strict';

require('fake-indexeddb/auto');
const { Criteria } = require('@archi-code/criteria');

let databases = 0;

function openStore(documents) {
  databases++;
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(`dist-check-${databases}`, 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore('records', { keyPath: 'id' });
      store.createIndex('age', 'age');
      store.createIndex('name', 'name');
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction('records', 'readwrite');
      documents.forEach((document) => transaction.objectStore('records').add(document));
      transaction.oncomplete = () => resolve(database);
      transaction.onerror = () => reject(transaction.error);
    };
  });
}

function smoke(m) {
  return [
    [
      'planIndexedDbQuery picks the index of an equality',
      () => {
        const plan = m.planIndexedDbQuery(Criteria.create({ where: { age: 30 } }), [
          { name: null, keyPath: 'id' },
          { name: 'age', keyPath: 'age' },
        ]);
        return plan.index === 'age' || `unexpected plan ${JSON.stringify(plan)}`;
      },
    ],
    [
      'searchIndexedDb filters through an index, sorts, paginates and counts',
      async () => {
        const database = await openStore([
          { id: 'a', age: 30, name: 'a' },
          { id: 'b', age: 15, name: '\uFF71' },
          { id: 'c', age: 40, name: '\u{1F600}' },
          { id: 'd', age: 50, name: 'd' },
        ]);
        const search = (input) =>
          m.searchIndexedDb(
            database.transaction('records', 'readonly').objectStore('records'),
            Criteria.create(input),
            { withTotal: true },
          );
        const byAge = await search({
          where: { age: { gte: 18 } },
          orderBy: { age: 'desc' },
          limit: 2,
        });
        const byName = await search({
          where: { name: { gte: 'a' } },
          orderBy: { name: 'desc' },
          limit: 1,
        });
        const ages = byAge.items.map((item) => item.id).join();
        const names = byName.items.map((item) => item.id).join();
        return (
          (ages === 'd,c' && byAge.total === 3 && names === 'c' && byName.total === 4) ||
          `unexpected ${ages} (${byAge.total}) / ${names} (${byName.total})`
        );
      },
    ],
  ];
}

async function contractOnTheBrowserIndexedDb(entry) {
  const m = await import(entry);
  const { runCriteriaContract } = await import(
    new URL('/test/contract/run-criteria-contract', entry).href
  );
  const layouts = {
    'without indexes': { keyPath: 'id', indexes: [] },
    'without a key path': { keyPath: null, indexes: [] },
    'with indexes': {
      keyPath: 'id',
      indexes: [
        ['age', 'age'],
        ['status', 'status'],
        ['name', 'name'],
        ['createdAt', 'createdAt'],
        ['city', 'address.city'],
        ['zip', 'address.zip'],
        ['title', 'title'],
        ['tags', 'tags', true],
      ],
    },
  };
  const open = (name, layout, records) =>
    new Promise((resolve, reject) => {
      const request = indexedDB.open(`${name}-${Date.now()}-${Math.random()}`, 1);
      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore(
          'records',
          layout.keyPath === null ? { autoIncrement: true } : { keyPath: layout.keyPath },
        );
        for (const [index, keyPath, multiEntry] of layout.indexes) {
          store.createIndex(index, keyPath, { multiEntry: multiEntry === true });
        }
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction('records', 'readwrite');
        records.forEach((record) => transaction.objectStore('records').add(record));
        transaction.oncomplete = () => resolve(database);
        transaction.onerror = () => reject(transaction.error);
      };
    });
  const problems = [];
  for (const [name, layout] of Object.entries(layouts)) {
    let database = null;
    const failures = await runCriteriaContract({
      setup: async (documents) => {
        database = await open(name, layout, documents);
      },
      search: (criteria, options) =>
        m.searchIndexedDb(
          database.transaction('records', 'readonly').objectStore('records'),
          criteria,
          options,
        ),
    });
    database.close();
    if (failures.length > 0) problems.push(`${name}: ${JSON.stringify(failures)}`);
  }
  return problems.length === 0 || problems.join('\n');
}

function browser() {
  return [
    [
      'searchIndexedDb passes the criteria contract on the browser IndexedDB, in every store layout',
      contractOnTheBrowserIndexedDb,
    ],
  ];
}

module.exports = { smoke, browser };
