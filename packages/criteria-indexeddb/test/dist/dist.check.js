'use strict';

require('fake-indexeddb/auto');
const { Criteria, runCriteriaContract } = require('@archi-code/criteria');

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
      'searchIndexedDb passes the criteria contract',
      async () => {
        let database = null;
        const failures = await runCriteriaContract({
          setup: async (documents) => {
            database = await openStore(documents);
          },
          search: (criteria, options) =>
            m.searchIndexedDb(
              database.transaction('records', 'readonly').objectStore('records'),
              criteria,
              options,
            ),
        });
        return failures.length === 0 || JSON.stringify(failures);
      },
    ],
  ];
}

module.exports = { smoke };
