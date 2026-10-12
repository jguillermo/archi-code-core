'use strict';

function smoke(m) {
  return [
    [
      'EphemeraDb persists, finds and removes',
      async () => {
        const db = new m.EphemeraDb();
        await db.persist({ id: '1', name: 'a' });
        const found = await db.findById('1');
        const removed = await db.remove('1');
        return found.name === 'a' && removed === true && (await db.findById('1')) === null;
      },
    ],
  ];
}

module.exports = { smoke };
