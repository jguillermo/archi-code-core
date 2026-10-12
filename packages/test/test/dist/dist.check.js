'use strict';

function smoke(m) {
  return [
    [
      'JsonCompare.strict reports differences',
      () =>
        JSON.stringify(m.JsonCompare.strict({ a: 1, b: 'x' }, { a: 1, b: 'y' })) ===
        JSON.stringify(['b: x -> y']),
    ],
    [
      'JsonCompare.strict accepts equal objects',
      () => m.JsonCompare.strict({ a: 1 }, { a: 1 }).length === 0,
    ],
  ];
}

module.exports = { smoke };
