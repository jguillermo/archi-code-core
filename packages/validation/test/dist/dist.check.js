'use strict';

function smoke(m) {
  return [
    ['validator.isEmail', () => m.validator.isEmail('a@b.com') === true],
    [
      'toInteger',
      () =>
        JSON.stringify(m.toInteger('42')) === JSON.stringify({ ok: true, value: 42, error: null }),
    ],
    [
      'toBoolean failure',
      () => m.toBoolean('maybe').ok === false && typeof m.toBoolean('maybe').error === 'string',
    ],
    ['canBeDate', () => m.canBeDate('2024/01/31') === true],
    ['sanitizer.trim', () => m.sanitizer.trim('  a  ') === 'a'],
    [
      'runValidations',
      () => {
        class Age {}
        m.Validations([{ validator: 'isInt', properties: { min: 2 } }])(Age);
        const invalid = m.runValidations(Age, '1');
        const valid = m.runValidations(Age, '5');
        return (
          invalid.ok === false &&
          invalid.errors.length === 1 &&
          valid.ok === true &&
          valid.errors.length === 0
        );
      },
    ],
  ];
}

function crossBuild(cjs, esm) {
  return [
    [
      'share the @Validations registry',
      () => {
        class DecoratedWithCjs {}
        cjs.Validations([{ validator: 'isInt' }])(DecoratedWithCjs);
        class DecoratedWithEsm {}
        esm.Validations([{ validator: 'isEmail' }])(DecoratedWithEsm);
        return (
          esm.runValidations(DecoratedWithCjs, 'x').errors.length === 1 &&
          cjs.runValidations(DecoratedWithEsm, 'x').errors.length === 1
        );
      },
    ],
  ];
}

const WEB_INPUTS = [
  'a',
  '1',
  '-2.5',
  '2024/01/31',
  '',
  'a@b.com',
  'https://x.io',
  'true',
  '{"a":1}',
];

function publicFunctions(ns) {
  return [
    ...Object.entries(ns.validator)
      .filter(([, fn]) => typeof fn === 'function')
      .map(([name, fn]) => [`validator.${name}`, fn]),
    ...Object.entries(ns).filter(
      ([name, fn]) => typeof fn === 'function' && /^(to|canBe|anyToString$)/.test(name),
    ),
    ...Object.entries(ns.sanitizer)
      .filter(([, fn]) => typeof fn === 'function')
      .map(([name, fn]) => [`sanitizer.${name}`, fn]),
  ];
}

function outcome(fn, args) {
  try {
    return { value: JSON.stringify(fn(...args)) };
  } catch (e) {
    return { error: e && e.name };
  }
}

function nodeOutcomes(inputs) {
  const node = require('../../dist/cjs/index.js');
  return Object.fromEntries(
    publicFunctions(node).map(([name, fn]) => [
      name,
      inputs.flatMap((input) => [outcome(fn, [input]), outcome(fn, [input, 'en-US'])]),
    ]),
  );
}

function sameAsNode(webOutcomes) {
  const expected = nodeOutcomes(WEB_INPUTS);
  const webNames = Object.keys(webOutcomes).sort();
  const nodeNames = Object.keys(expected).sort();
  if (webNames.join() !== nodeNames.join()) {
    return `web exposes ${webNames.length} public functions, Node ${nodeNames.length}`;
  }
  for (const name of nodeNames) {
    const index = webOutcomes[name].findIndex(
      (result, i) => JSON.stringify(result) !== JSON.stringify(expected[name][i]),
    );
    if (index === -1) continue;
    const args = [WEB_INPUTS[Math.floor(index / 2)], ...(index % 2 ? ['en-US'] : [])];
    const web = webOutcomes[name][index];
    if (web.error === 'ReferenceError') {
      return `${name}(${JSON.stringify(args)}) uses an API missing in browsers (ReferenceError)`;
    }
    return `${name}(${JSON.stringify(args)}) differs: web=${JSON.stringify(web)} node=${JSON.stringify(expected[name][index])}`;
  }
  return true;
}

async function webOutcomesInThePage({ entry, input }) {
  const m = await import(entry);
  const functionsOf = (object, prefix) =>
    Object.entries(object)
      .filter(([, fn]) => typeof fn === 'function')
      .map(([name, fn]) => [`${prefix}${name}`, fn]);
  const functions = [
    ...functionsOf(m.validator, 'validator.'),
    ...functionsOf(m, '').filter(([name]) => /^(to|canBe|anyToString$)/.test(name)),
    ...functionsOf(m.sanitizer, 'sanitizer.'),
  ];
  const run = (fn, args) => {
    try {
      return { value: JSON.stringify(fn(...args)) };
    } catch (e) {
      return { error: e && e.name };
    }
  };
  return Object.fromEntries(
    functions.map(([name, fn]) => [
      name,
      input.flatMap((value) => [run(fn, [value]), run(fn, [value, 'en-US'])]),
    ]),
  );
}

function browser() {
  return [
    [
      'isLength counts graphemes with Intl.Segmenter',
      async (entry) => {
        const m = await import(entry);
        return m.validator.isLength('👨‍👩‍👧', { max: 1, graphemes: true }) === true;
      },
    ],
    [
      'every public function gives the same result as in Node',
      webOutcomesInThePage,
      { input: () => WEB_INPUTS, verify: sameAsNode },
    ],
  ];
}

module.exports = { smoke, crossBuild, browser };
